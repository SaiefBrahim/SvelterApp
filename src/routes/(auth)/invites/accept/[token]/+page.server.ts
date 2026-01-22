import { error, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { InviteService } from "$lib/server/services";
import { db } from "$lib/server/db";
import crypto from "crypto";
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async ({ params }) => {
    const invite = await InviteService.getByToken(params.token);

    if (!invite) {
        throw error(404, "Invalid or expired invite");
    }

    if (invite.status !== "PENDING") {
        throw error(400, `This invite has been ${invite.status.toLowerCase()}`);
    }

    return {
        invite
    };
};

export const actions: Actions = {
    default: async ({ request, params, cookies }) => {
        const invite = await InviteService.getByToken(params.token);

        if (!invite) {
            throw error(404, "Invalid or expired invite");
        }

        if (invite.status !== "PENDING") {
            throw error(400, `This invite has been ${invite.status.toLowerCase()}`);
        }

        const formData = await request.formData();
        const firstName = formData.get("firstName")?.toString().trim();
        const lastName = formData.get("lastName")?.toString().trim();
        const password = formData.get("password")?.toString();
        const confirmPassword = formData.get("confirmPassword")?.toString();

        if (!firstName || !lastName || !password || !confirmPassword) {
            throw error(400, "All fields are required");
        }

        if (password !== confirmPassword) {
            throw error(400, "Passwords do not match");
        }

        if (password.length < 8) {
            throw error(400, "Password must be at least 8 characters");
        }

        try {
            // Get audit context (no session yet, but we can get IP/user agent)
            const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
            const userAgent = request.headers.get('user-agent') || null;
            const auditContext = {
                userId: null, // User doesn't exist yet
                organizationId: invite.organizationId,
                ipAddress,
                userAgent
            };

            const result = await InviteService.accept(params.token, {
                firstName,
                lastName,
                password
            }, auditContext);

            // Auto-login the user by creating a session
            const sessionToken = crypto.randomUUID();
            const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

            await db.session.create({
                data: {
                    sessionToken,
                    userId: result.userId,
                    expires
                }
            });

            cookies.set("session-token", sessionToken, {
                path: "/",
                httpOnly: true,
                sameSite: "lax",
                secure: env.ENVIRONMENT === "production",
                maxAge: 30 * 24 * 60 * 60
            });

            throw redirect(303, "/dashboard");
        } catch (err) {
            if (err instanceof Error && err.message.includes("already exists")) {
                throw error(400, "An account with this email already exists. Please log in instead.");
            }
            throw err;
        }
    }
};
