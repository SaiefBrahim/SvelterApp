import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { signupSchema } from '$lib/utils/validation';
import { superValidate, setError } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { UserService, OrganizationService } from '$lib/server/services';
import { db } from '$lib/server/db';
import { createSession } from '$lib/server/auth';
import crypto from 'crypto';
import { logActivity, AUDIT_ACTIONS, AUDIT_RESOURCES } from '$lib/server/utils/audit-logger';

export const load: PageServerLoad = async () => {
    // Disable public signup - users can only join via invitation or admin-created accounts
    throw redirect(303, '/login');
};

export const actions: Actions = {
    default: async (event) => {
        const form = await superValidate(event.request, zod(signupSchema) as any) as any;

        if (!form.valid) {
            return { form };
        }

        const { email, password, firstName, lastName } = form.data;

        // Check if user already exists
        const existingUser = await db.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (existingUser) {
            setError(form, 'email', 'An account with this email already exists');
            return { form };
        }

        try {
            // Get audit context
            const ipAddress = event.getClientAddress();
            const userAgent = event.request.headers.get('user-agent') || null;
            const auditContext = {
                userId: null, // User doesn't exist yet
                organizationId: null, // Organization doesn't exist yet
                ipAddress,
                userAgent
            };

            // Create a new organization for the user
            // OrganizationService.create() automatically creates default roles
            const organization = await OrganizationService.create({
                name: `${firstName}'s Organization`,
                slug: `org-${crypto.randomUUID().slice(0, 8)}`,
                isActive: true
            }, auditContext);

            // Get default OPERATOR role for the organization (created by OrganizationService)
            const role = await db.role.findFirst({
                where: {
                    name: 'OPERATOR',
                    organizationId: organization.id
                }
            });

            if (!role) {
                throw new Error('Default role not found. Please contact support.');
            }

            // Create user (with updated audit context now that org exists)
            const userAuditContext = {
                userId: null, // User doesn't exist yet
                organizationId: organization.id,
                ipAddress,
                userAgent
            };

            const user = await UserService.create({
                email,
                password,
                firstName,
                lastName,
                roleId: role.id,
                organizationId: organization.id,
                isActive: true
            }, userAuditContext);

            // Log signup activity
            await logActivity(
                {
                    action: AUDIT_ACTIONS.SIGNUP,
                    resource: AUDIT_RESOURCES.USER,
                    resourceId: user.id,
                    metadata: { email: user.email }
                },
                {
                    userId: user.id,
                    organizationId: organization.id,
                    ipAddress,
                    userAgent
                }
            );

            // Auto-login
            await createSession(event, user.id);

            throw redirect(303, '/dashboard');
        } catch (err) {
            console.error('Signup error:', err);
            if (err instanceof Error && err.message.includes('already exists')) {
                setError(form, 'email', 'An account with this email already exists');
            } else {
                setError(form, '', 'Failed to create account. Please try again.');
            }
            return { form };
        }
    }
};
