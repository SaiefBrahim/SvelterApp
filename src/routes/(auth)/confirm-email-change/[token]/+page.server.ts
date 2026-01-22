import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { EmailChangeService } from '$lib/server/services';
import { logActivity, AUDIT_ACTIONS, AUDIT_RESOURCES } from '$lib/server/utils/audit-logger';

export const load: PageServerLoad = async ({ params }) => {
    // Verify token
    const verification = await EmailChangeService.verifyEmailChange(params.token);

    if (!verification) {
        throw error(400, 'Invalid or expired email change token');
    }

    return {
        newEmail: verification.newEmail,
        token: params.token
    };
};

export const actions: Actions = {
    default: async (event) => {
        const { params, request, locals } = event;

        // Get IP and user agent for audit log
        let ipAddress = 'unknown';
        try {
            ipAddress = event.getClientAddress();
        } catch {
            ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                       request.headers.get('x-real-ip') || 
                       'unknown';
        }
        const userAgent = request.headers.get('user-agent') || null;

        // Get user info before completing email change
        const verification = await EmailChangeService.verifyEmailChange(params.token);
        if (!verification) {
            throw error(400, 'Invalid or expired email change token');
        }

        // Get user to get organizationId for audit log
        const { db } = await import('$lib/server/db');
        const user = await db.user.findUnique({
            where: { id: verification.userId },
            select: { id: true, organizationId: true, email: true }
        });

        if (!user) {
            throw error(404, 'User not found');
        }

        console.log('📧 [EmailChange] Completing email change:', {
            userId: verification.userId,
            oldEmail: user.email,
            newEmail: verification.newEmail,
            token: params.token.substring(0, 8) + '...'
        });

        try {
            // Complete email change
            await EmailChangeService.completeEmailChange(
                params.token,
                {
                    userId: verification.userId,
                    organizationId: user.organizationId || null,
                    ipAddress,
                    userAgent
                }
            );

            console.log('✅ [EmailChange] Email change completed successfully');
        } catch (err) {
            console.error('❌ [EmailChange] Error completing email change:', err);
            
            if (err instanceof Error && err.message.includes('expired')) {
                throw error(400, 'This email change link has expired. Please request a new one.');
            } else if (err instanceof Error && err.message.includes('Invalid')) {
                throw error(400, 'Invalid email change link. Please request a new one.');
            } else if (err instanceof Error && err.message.includes('already in use')) {
                throw error(400, 'The new email address is already in use. Please use a different email.');
            } else {
                throw error(500, 'Failed to change email. Please try again.');
            }
        }

        // Check if user is logged in (and it's the same user)
        const isLoggedIn = locals.session?.user?.id === verification.userId;

        // Redirect to settings if logged in, otherwise to login
        if (isLoggedIn) {
            throw redirect(303, '/settings?emailChanged=success');
        } else {
            throw redirect(303, '/login?emailChanged=success');
        }
    }
};
