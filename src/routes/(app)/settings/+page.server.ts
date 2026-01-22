import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { UserService, EmailChangeService } from '$lib/server/services';
import { updateProfileSchema, requestEmailChangeSchema, changePasswordSchema } from '$lib/utils/validation';
import { superValidate, setError } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { getAuditContext } from '$lib/server/utils/audit-context';
import { verifyPassword } from '$lib/server/auth/password';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals, url }) => {
    if (!locals.session?.user) {
        throw error(401, 'Unauthorized');
    }

    const user = await UserService.getById(locals.session.user.id);

    if (!user) {
        throw error(404, 'User not found');
    }

    const profileForm = await superValidate(
        {
            firstName: user.firstName,
            lastName: user.lastName
        },
        zod(updateProfileSchema) as any
    ) as any;

    const emailChangeForm = await superValidate(zod(requestEmailChangeSchema) as any) as any;
    const passwordChangeForm = await superValidate(zod(changePasswordSchema) as any) as any;

    // Check for pending email change request
    const pendingEmailChange = await EmailChangeService.getPendingRequest(user.id);

    // Check if email was just changed (from query param)
    const emailChanged = url.searchParams.get('emailChanged') === 'success';

    return {
        user,
        profileForm,
        emailChangeForm,
        passwordChangeForm,
        pendingEmailChange,
        emailChanged
    };
};

export const actions: Actions = {
    updateProfile: async (event) => {
        const { request, locals } = event;

        if (!locals.session?.user) {
            throw error(401, 'Unauthorized');
        }

        const form = await superValidate(request, zod(updateProfileSchema) as any) as any;

        if (!form.valid) {
            form.valid = false;
            return fail(400, { profileForm: form });
        }

        try {
            const auditContext = getAuditContext(event, locals.session);
            await UserService.update(
                locals.session.user.id,
                {
                    firstName: form.data.firstName,
                    lastName: form.data.lastName
                },
                auditContext
            );

            return {
                profileForm: form,
                success: true
            };
        } catch (err) {
            console.error('Update profile error:', err);
            setError(form, '', 'Failed to update profile. Please try again.');
            form.valid = false;
            return fail(400, { profileForm: form });
        }
    },

    requestEmailChange: async (event) => {
        const { request, locals } = event;

        if (!locals.session?.user) {
            throw error(401, 'Unauthorized');
        }

        const form = await superValidate(request, zod(requestEmailChangeSchema) as any) as any;

        if (!form.valid) {
            form.valid = false;
            return fail(400, { emailChangeForm: form });
        }

        try {
            const auditContext = getAuditContext(event, locals.session);
            await EmailChangeService.requestEmailChange(
                locals.session.user.id,
                form.data.newEmail,
                auditContext
            );

            // Get updated pending request
            const pendingEmailChange = await EmailChangeService.getPendingRequest(locals.session.user.id);
            
            return {
                emailChangeForm: form,
                emailChangeRequested: true,
                pendingEmailChange
            };
        } catch (err) {
            console.error('Request email change error:', err);
            if (err instanceof Error) {
                if (err.message.includes('already exists')) {
                    setError(form, 'newEmail', 'This email is already in use.');
                } else if (err.message.includes('different from current')) {
                    setError(form, 'newEmail', 'New email must be different from your current email.');
                } else if (err.message.includes('Failed to send') || err.message.includes('Email service is not configured')) {
                    setError(form, '', err.message || 'Failed to send confirmation email. Please check your email service configuration.');
                } else {
                    setError(form, '', err.message || 'Failed to request email change. Please try again.');
                }
            } else {
                setError(form, '', 'Failed to request email change. Please try again.');
            }
            form.valid = false;
            return fail(400, { emailChangeForm: form });
        }
    },

    cancelEmailChange: async (event) => {
        const { locals } = event;

        if (!locals.session?.user) {
            throw error(401, 'Unauthorized');
        }

        try {
            await EmailChangeService.cancelPendingRequest(locals.session.user.id);
            // Verify cancellation
            const pendingEmailChange = await EmailChangeService.getPendingRequest(locals.session.user.id);
            return { 
                emailChangeCancelled: true,
                pendingEmailChange
            };
        } catch (err) {
            console.error('Cancel email change error:', err);
            throw error(500, 'Failed to cancel email change request');
        }
    },

    resendEmailChangeConfirmation: async (event) => {
        const { locals } = event;

        if (!locals.session?.user) {
            throw error(401, 'Unauthorized');
        }

        try {
            const auditContext = getAuditContext(event, locals.session);
            await EmailChangeService.resendConfirmation(locals.session.user.id, auditContext);
            
            // Get updated pending request
            const pendingEmailChange = await EmailChangeService.getPendingRequest(locals.session.user.id);
            
            return { 
                emailChangeResent: true,
                pendingEmailChange
            };
        } catch (err) {
            console.error('Resend email change confirmation error:', err);
            if (err instanceof Error) {
                throw error(400, err.message);
            }
            throw error(500, 'Failed to resend confirmation email');
        }
    },

    changePassword: async (event) => {
        const { request, locals } = event;

        if (!locals.session?.user) {
            throw error(401, 'Unauthorized');
        }

        const form = await superValidate(request, zod(changePasswordSchema) as any) as any;

        if (!form.valid) {
            form.valid = false;
            return fail(400, { passwordChangeForm: form });
        }

        try {
            // Get user with password hash
            const user = await db.user.findUnique({
                where: { id: locals.session.user.id },
                select: { id: true, passwordHash: true }
            });

            if (!user) {
                throw error(404, 'User not found');
            }

            // Verify current password
            const isValidPassword = await verifyPassword(form.data.currentPassword, user.passwordHash);
            if (!isValidPassword) {
                setError(form, 'currentPassword', 'Current password is incorrect');
                form.valid = false;
                return fail(400, { passwordChangeForm: form });
            }

            // Check if new password is different from current
            const isSamePassword = await verifyPassword(form.data.newPassword, user.passwordHash);
            if (isSamePassword) {
                setError(form, 'newPassword', 'New password must be different from your current password');
                form.valid = false;
                return fail(400, { passwordChangeForm: form });
            }

            // Update password
            const auditContext = getAuditContext(event, locals.session);
            await UserService.update(
                locals.session.user.id,
                {
                    password: form.data.newPassword
                },
                auditContext
            );

            // Reset form after successful password change
            const resetForm = await superValidate(zod(changePasswordSchema) as any) as any;
            return {
                passwordChangeForm: resetForm,
                passwordChanged: true
            };
        } catch (err) {
            console.error('Change password error:', err);
            if (err instanceof Error && err.message.includes('incorrect')) {
                // Already handled above
            } else {
                setError(form, '', 'Failed to change password. Please try again.');
                form.valid = false;
            }
            return fail(400, { passwordChangeForm: form });
        }
    }
};
