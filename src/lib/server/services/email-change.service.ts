import { db } from '$lib/server/db';
import { UserService } from './user.service';
import { EmailService } from './email.service';
import { logUserActivity, AUDIT_ACTIONS } from '$lib/server/utils/audit-logger';
import type { AuditContext } from '$lib/server/utils/audit-context';

export class EmailChangeService {
    /**
     * Get pending email change request for a user
     */
    static async getPendingRequest(userId: string): Promise<{ newEmail: string; expires: Date } | null> {
        // Find any pending email change tokens for this user
        const tokens = await db.verificationToken.findMany({
            where: {
                identifier: {
                    startsWith: `email-change:${userId}:`
                },
                expires: {
                    gt: new Date() // Not expired
                }
            },
            orderBy: {
                expires: 'desc'
            },
            take: 1
        });

        if (tokens.length === 0) {
            return null;
        }

        const token = tokens[0];
        // Parse identifier: email-change:userId:newEmail
        const parts = token.identifier.split(':');
        if (parts.length < 3) {
            return null;
        }

        return {
            newEmail: parts[2],
            expires: token.expires
        };
    }

    /**
     * Cancel pending email change request
     */
    static async cancelPendingRequest(userId: string): Promise<void> {
        await db.verificationToken.deleteMany({
            where: {
                identifier: {
                    startsWith: `email-change:${userId}:`
                }
            }
        });
    }

    /**
     * Resend email change confirmation
     */
    static async resendConfirmation(userId: string, auditContext?: AuditContext): Promise<void> {
        const pending = await this.getPendingRequest(userId);
        if (!pending) {
            throw new Error('No pending email change request found');
        }

        // Get the token
        const tokens = await db.verificationToken.findMany({
            where: {
                identifier: {
                    startsWith: `email-change:${userId}:`
                },
                expires: {
                    gt: new Date()
                }
            },
            orderBy: {
                expires: 'desc'
            },
            take: 1
        });

        if (tokens.length === 0) {
            throw new Error('No valid token found for pending request');
        }

        const token = tokens[0];
        const user = await db.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            throw new Error('User not found');
        }

        // Resend the email
        try {
            await EmailService.sendEmailChangeConfirmationEmail(
                user.email,
                pending.newEmail,
                token.token
            );
        } catch (error: any) {
            console.error('Failed to resend email change confirmation:', error);
            throw new Error(`Failed to resend confirmation email: ${error?.message || 'Unknown error'}`);
        }
    }

    /**
     * Request an email change - sends confirmation to old email
     */
    static async requestEmailChange(
        userId: string,
        newEmail: string,
        auditContext?: AuditContext
    ): Promise<void> {
        // Get current user
        const user = await db.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            throw new Error('User not found');
        }

        // Check if new email already exists
        const existing = await db.user.findFirst({
            where: {
                email: newEmail.toLowerCase(),
                id: { not: userId }
            }
        });

        if (existing) {
            throw new Error('A user with this email already exists');
        }

        // Check if new email is same as current
        if (user.email.toLowerCase() === newEmail.toLowerCase()) {
            throw new Error('New email must be different from current email');
        }

        // Generate token
        const token = crypto.randomUUID();
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Store in VerificationToken table
        // identifier format: email-change:userId:newEmail
        const identifier = `email-change:${userId}:${newEmail.toLowerCase()}`;
        await db.verificationToken.upsert({
            where: {
                identifier_token: {
                    identifier,
                    token: token
                }
            },
            update: {
                expires
            },
            create: {
                identifier,
                token,
                expires
            }
        });

        // Send confirmation email to OLD email address
        console.log('📧 [EmailChange] Attempting to send email change confirmation:', {
            oldEmail: user.email,
            newEmail: newEmail,
            userId: userId,
            token: token.substring(0, 8) + '...'
        });
        
        try {
            await EmailService.sendEmailChangeConfirmationEmail(
                user.email,
                newEmail,
                token
            );
            console.log('✅ [EmailChange] Email change confirmation sent successfully to:', user.email);
        } catch (error: any) {
            console.error('❌ [EmailChange] Failed to send email change confirmation email:', {
                error: error?.message || error,
                errorStack: error?.stack,
                oldEmail: user.email,
                newEmail: newEmail,
                userId: userId,
                errorType: error?.constructor?.name,
                errorDetails: error
            });
            // Re-throw the error so the action handler can catch it and show it to the user
            throw new Error(`Failed to send confirmation email: ${error?.message || 'Unknown error'}`);
        }

        // Log activity
        await logUserActivity(
            AUDIT_ACTIONS.UPDATE,
            user.id,
            {
                action: 'EMAIL_CHANGE_REQUESTED',
                oldEmail: user.email,
                newEmail: newEmail.toLowerCase()
            },
            auditContext
        );
    }

    /**
     * Verify and complete email change using token
     */
    static async verifyEmailChange(token: string): Promise<{ userId: string; newEmail: string } | null> {
        const verificationToken = await db.verificationToken.findUnique({
            where: { token }
        });

        if (!verificationToken) {
            return null;
        }

        // Check if expired
        if (verificationToken.expires < new Date()) {
            await db.verificationToken.delete({
                where: { token }
            });
            return null;
        }

        // Parse identifier: email-change:userId:newEmail
        if (!verificationToken.identifier.startsWith('email-change:')) {
            return null;
        }

        const parts = verificationToken.identifier.split(':');
        if (parts.length < 3) {
            return null;
        }

        const userId = parts[1];
        const newEmail = parts[2];

        // Verify user exists
        const user = await db.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return null;
        }

        // Check if new email still available
        const existing = await db.user.findFirst({
            where: {
                email: newEmail.toLowerCase(),
                id: { not: userId }
            }
        });

        if (existing) {
            // Delete token since email is no longer available
            await db.verificationToken.delete({
                where: { token }
            });
            throw new Error('Email is already in use');
        }

        return { userId, newEmail: newEmail.toLowerCase() };
    }

    /**
     * Complete email change after verification
     */
    static async completeEmailChange(
        token: string,
        auditContext?: AuditContext
    ): Promise<void> {
        const verification = await this.verifyEmailChange(token);

        if (!verification) {
            throw new Error('Invalid or expired email change token');
        }

        const { userId, newEmail } = verification;

        // Get user before update
        const user = await db.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            throw new Error('User not found');
        }

        const oldEmail = user.email;

        console.log('📧 [EmailChange] Updating email in database:', {
            userId,
            oldEmail,
            newEmail
        });

        // Update email (skip generic audit log, we'll log EMAIL_CHANGED specifically)
        const updatedUser = await UserService.update(
            userId,
            { email: newEmail },
            auditContext,
            true // skipAuditLog = true
        );

        console.log('✅ [EmailChange] Email updated in database:', {
            userId: updatedUser.id,
            newEmail: updatedUser.email
        });

        // Delete used token
        await db.verificationToken.delete({
            where: { token }
        });

        console.log('🗑️ [EmailChange] Deleted verification token');

        // Log activity
        await logUserActivity(
            AUDIT_ACTIONS.UPDATE,
            userId,
            {
                action: 'EMAIL_CHANGED',
                oldEmail,
                newEmail
            },
            auditContext
        );

        console.log('📝 [EmailChange] Logged audit activity for email change');
    }
}
