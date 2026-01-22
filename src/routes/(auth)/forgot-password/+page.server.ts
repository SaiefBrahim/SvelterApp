import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { forgotPasswordSchema } from '$lib/utils/validation';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { PasswordResetService } from '$lib/server/services';
import { logActivity, AUDIT_ACTIONS, AUDIT_RESOURCES } from '$lib/server/utils/audit-logger';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async () => {
    const form = await superValidate(zod(forgotPasswordSchema) as any) as any;
    return { form };
};

export const actions: Actions = {
    default: async (event) => {
        const { request } = event;
        const form = await superValidate(request, zod(forgotPasswordSchema) as any) as any;

        if (!form.valid) {
            return { form, success: false };
        }

        const { email } = form.data;

        try {
            // Create reset token and send email (always succeeds to prevent email enumeration)
            await PasswordResetService.createResetToken(email);
            
            // Log forgot password activity (check if user exists but don't reveal)
            const user = await db.user.findUnique({
                where: { email: email.toLowerCase() },
                select: { id: true, organizationId: true }
            });

            let ipAddress = 'unknown';
            try {
                ipAddress = event.getClientAddress();
            } catch {
                ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                           request.headers.get('x-real-ip') || 
                           'unknown';
            }
            const userAgent = request.headers.get('user-agent') || null;

            if (user) {
                await logActivity(
                    {
                        action: AUDIT_ACTIONS.FORGOT_PASSWORD,
                        resource: AUDIT_RESOURCES.USER,
                        resourceId: user.id,
                        metadata: { email }
                    },
                    {
                        userId: user.id,
                        organizationId: user.organizationId,
                        ipAddress,
                        userAgent
                    }
                );
            }
            
            // Always return success for security (don't reveal if email exists)
            return { 
                form, 
                success: true,
                message: 'If an account with that email exists, a password reset link has been sent.'
            };
        } catch (err) {
            console.error('Forgot password error:', err);
            // Still return success to prevent email enumeration
            return { 
                form, 
                success: true,
                message: 'If an account with that email exists, a password reset link has been sent.'
            };
        }
    }
};
