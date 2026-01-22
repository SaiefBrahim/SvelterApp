import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { resetPasswordSchema } from '$lib/utils/validation';
import { superValidate, setError } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { PasswordResetService } from '$lib/server/services';
import { logActivity, AUDIT_ACTIONS, AUDIT_RESOURCES } from '$lib/server/utils/audit-logger';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async ({ params }) => {
    // Verify token
    const tokenData = await PasswordResetService.verifyResetToken(params.token);

    if (!tokenData) {
        throw error(400, 'Invalid or expired reset token');
    }

    const form = await superValidate(zod(resetPasswordSchema) as any) as any;
    return { form, email: tokenData.email };
};

export const actions: Actions = {
    default: async (event) => {
        const { request, params, cookies } = event;
        const form = await superValidate(request, zod(resetPasswordSchema) as any) as any;

        if (!form.valid) {
            return { form };
        }

        const { password } = form.data;

        try {
            // Get email from token before resetting (token gets deleted)
            const tokenData = await PasswordResetService.verifyResetToken(params.token);
            
            if (!tokenData) {
                setError(form, '', 'Invalid or expired reset token');
                return { form };
            }

            // Reset password (this deletes the token)
            await PasswordResetService.resetPassword(params.token, password);

            // Auto-login the user
            const { db } = await import('$lib/server/db');
            const user = await db.user.findUnique({
                where: { email: tokenData.email }
            });

            if (user) {
                // Create session manually
                const crypto = await import('crypto');
                const sessionToken = crypto.randomUUID();
                const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

                await db.session.create({
                    data: {
                        sessionToken,
                        userId: user.id,
                        expires
                    }
                });

                cookies.set('session-token', sessionToken, {
                    path: '/',
                    httpOnly: true,
                    sameSite: 'lax',
                    secure: env.ENVIRONMENT === 'production',
                    maxAge: 30 * 24 * 60 * 60
                });

                // Log password reset activity
                let ipAddress = 'unknown';
                try {
                    ipAddress = event.getClientAddress();
                } catch {
                    ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                               request.headers.get('x-real-ip') || 
                               'unknown';
                }
                const userAgent = request.headers.get('user-agent') || null;
                await logActivity(
                    {
                        action: AUDIT_ACTIONS.RESET_PASSWORD,
                        resource: AUDIT_RESOURCES.USER,
                        resourceId: user.id,
                        metadata: { email: user.email }
                    },
                    {
                        userId: user.id,
                        organizationId: user.organizationId,
                        ipAddress,
                        userAgent
                    }
                );
            }

            throw redirect(303, '/dashboard?passwordReset=success');
        } catch (err) {
            if (err instanceof Error && err.message.includes('expired')) {
                setError(form, '', 'This reset link has expired. Please request a new one.');
            } else if (err instanceof Error && err.message.includes('Invalid')) {
                setError(form, '', 'Invalid reset link. Please request a new one.');
            } else {
                console.error('Reset password error:', err);
                setError(form, '', 'Failed to reset password. Please try again.');
            }
            return { form };
        }
    }
};
