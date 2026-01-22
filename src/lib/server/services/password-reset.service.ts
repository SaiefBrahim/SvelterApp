import { db } from "$lib/server/db";
import crypto from "crypto";
import { hashPassword } from "$lib/server/auth/password";
import { EmailService } from "./email.service";

export interface PasswordResetToken {
    token: string;
    email: string;
    expires: Date;
}

export class PasswordResetService {
    /**
     * Create a password reset token
     */
    static async createResetToken(email: string): Promise<string> {
        // Check if user exists
        const user = await db.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (!user) {
            // Don't reveal if user exists - security best practice
            return crypto.randomUUID();
        }

        // Generate token
        const token = crypto.randomUUID();
        const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        // Store in VerificationToken table (identifier = email, token = reset token)
        await db.verificationToken.upsert({
            where: {
                identifier_token: {
                    identifier: email.toLowerCase(),
                    token: token
                }
            },
            update: {
                expires
            },
            create: {
                identifier: email.toLowerCase(),
                token,
                expires
            }
        });

        // Send reset email
        try {
            await EmailService.sendPasswordResetEmail(email, token);
        } catch (error) {
            console.error('Failed to send password reset email:', error);
            // Don't throw - token is created, email failure is logged
        }

        return token;
    }

    /**
     * Verify and get reset token
     */
    static async verifyResetToken(token: string): Promise<{ email: string } | null> {
        const verificationToken = await db.verificationToken.findUnique({
            where: { token }
        });

        if (!verificationToken) {
            return null;
        }

        // Check if expired
        if (verificationToken.expires < new Date()) {
            // Delete expired token
            await db.verificationToken.delete({
                where: { token }
            });
            return null;
        }

        return {
            email: verificationToken.identifier
        };
    }

    /**
     * Reset password using token
     */
    static async resetPassword(token: string, newPassword: string): Promise<void> {
        const verificationToken = await db.verificationToken.findUnique({
            where: { token }
        });

        if (!verificationToken) {
            throw new Error("Invalid or expired reset token");
        }

        // Check if expired
        if (verificationToken.expires < new Date()) {
            await db.verificationToken.delete({
                where: { token }
            });
            throw new Error("Reset token has expired");
        }

        // Get user by email
        const user = await db.user.findUnique({
            where: { email: verificationToken.identifier }
        });

        if (!user) {
            throw new Error("User not found");
        }

        // Update password
        const passwordHash = await hashPassword(newPassword);
        await db.user.update({
            where: { id: user.id },
            data: { passwordHash }
        });

        // Delete used token
        await db.verificationToken.delete({
            where: { token }
        });
    }
}
