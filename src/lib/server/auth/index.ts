import type { Handle, RequestEvent } from "@sveltejs/kit";
import { redirect } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import { verifyPassword } from "./password";
import type { RoleName } from "$lib/server/rbac/permissions";
import crypto from "crypto";
import { logActivity, AUDIT_ACTIONS, AUDIT_RESOURCES } from "$lib/server/utils/audit-logger";
import { env } from '$env/dynamic/private';

const SESSION_COOKIE_NAME = "session-token";
const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

export interface AuthSession {
    expires: string;
    user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: RoleName;
        organizationId: string | null;
        isActive: boolean;
    };
}

async function getSessionFromRequest(event: RequestEvent): Promise<AuthSession | null> {
    const token = event.cookies.get(SESSION_COOKIE_NAME);
    if (!token) return null;

    const session = await db.session.findUnique({
        where: { sessionToken: token },
        include: {
            user: {
                include: {
                    role: true
                }
            }
        }
    });

    if (!session) return null;

    if (session.expires < new Date()) {
        await db.session.delete({ where: { id: session.id } });
        event.cookies.delete(SESSION_COOKIE_NAME, { path: "/" });
        return null;
    }

    return {
        expires: session.expires.toISOString(),
        user: {
            id: session.user.id,
            email: session.user.email,
            firstName: session.user.firstName,
            lastName: session.user.lastName,
            role: session.user.role.name as RoleName,
            organizationId: session.user.organizationId,
            isActive: session.user.isActive
        }
    };
}

export async function createSession(event: RequestEvent, userId: string) {
    const sessionToken = crypto.randomUUID();
    const expires = new Date(Date.now() + SESSION_MAX_AGE * 1000);

    await db.session.create({
        data: {
            sessionToken,
            userId,
            expires
        }
    });

    event.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: env.ENVIRONMENT === "production",
        maxAge: SESSION_MAX_AGE
    });
}

export const handle: Handle = async ({ event, resolve }) => {
    event.locals.auth = async () => getSessionFromRequest(event);
    return resolve(event);
};

export async function signIn(event: RequestEvent) {
    const formData = await event.request.formData();
    const email = formData.get("email")?.toString().trim().toLowerCase();
    const password = formData.get("password")?.toString();
    const callbackUrl = formData.get("callbackUrl")?.toString() || "/dashboard";

    if (!email || !password) {
        throw redirect(303, "/login?error=CredentialsSignin");
    }

    const user = await db.user.findUnique({
        where: { email },
        include: { role: true }
    });

    if (!user || !user.isActive) {
        throw redirect(303, "/login?error=CredentialsSignin");
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
        throw redirect(303, "/login?error=CredentialsSignin");
    }

    await db.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
    });

    await createSession(event, user.id);
    throw redirect(303, callbackUrl);
}

export async function signOut(event: RequestEvent) {
    const token = event.cookies.get(SESSION_COOKIE_NAME);
    let userId: string | null = null;
    
    if (token) {
        const session = await db.session.findUnique({
            where: { sessionToken: token },
            include: { user: true }
        });
        if (session) {
            userId = session.userId;
            await db.session.delete({ where: { id: session.id } });
        }
        event.cookies.delete(SESSION_COOKIE_NAME, { path: "/" });
    }

    // Log logout activity
    if (userId) {
        const ipAddress = event.getClientAddress();
        const userAgent = event.request.headers.get('user-agent') || null;
        await logActivity(
            {
                action: AUDIT_ACTIONS.LOGOUT,
                resource: AUDIT_RESOURCES.USER,
                resourceId: userId
            },
            {
                userId,
                organizationId: null, // Will be set from user if needed
                ipAddress,
                userAgent
            }
        );
    }

    throw redirect(303, "/login");
}
