import { Resend } from 'resend';
import { env } from '$env/dynamic/private';

// Initialize Resend with API key
const resendApiKey = env.RESEND_API_KEY;
if (!resendApiKey) {
    console.warn('⚠️  RESEND_API_KEY is not set. Email functionality will not work.');
}

const resend = resendApiKey ? new Resend(resendApiKey) : null;
const mailerAddress = env.MAILER_ADDRESS || 'SvelterApp <noreply@svelterapp.com>';

export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

export class EmailService {
    /**
     * Send an email using Resend
     */
    static async sendEmail(options: EmailOptions): Promise<void> {
        // Check if Resend API key is configured
        if (!resendApiKey || !resend) {
            const errorMsg = 'Email service is not configured. Please set RESEND_API_KEY environment variable.';
            console.error('❌', errorMsg);
            throw new Error(errorMsg);
        }

        try {
            console.log('📧 Attempting to send email:', {
                to: options.to,
                subject: options.subject,
                from: mailerAddress
            });

            const result = await resend.emails.send({
                from: mailerAddress,
                to: options.to,
                subject: options.subject,
                html: options.html,
                text: options.text || options.html.replace(/<[^>]*>/g, '')
            });

            // Log the full result for debugging
            console.log('📧 Resend API response:', {
                hasData: !!result.data,
                hasError: !!result.error,
                dataId: result.data?.id,
                errorName: result.error?.name,
                errorMessage: result.error?.message,
                fullResult: JSON.stringify(result, null, 2)
            });

            // Check for errors in the response (Resend returns { data, error })
            if (result.error) {
                const errorMessage = result.error.message || JSON.stringify(result.error);
                const errorName = result.error.name || 'Unknown error';
                console.error('❌ Resend API returned an error:', {
                    error: result.error,
                    errorName,
                    errorMessage,
                    statusCode: (result.error as any)?.statusCode,
                    to: options.to,
                    subject: options.subject,
                    fullResult: result
                });
                throw new Error(`Resend API error (${errorName}): ${errorMessage}`);
            }

            // Verify we got a successful response with an ID
            if (!result.data) {
                console.error('❌ Resend API returned no data:', {
                    result,
                    to: options.to,
                    subject: options.subject
                });
                throw new Error('Resend API returned no data');
            }

            if (!result.data.id) {
                console.error('❌ Resend API returned data without ID:', {
                    result,
                    data: result.data,
                    to: options.to,
                    subject: options.subject
                });
                throw new Error('Resend API returned data without email ID');
            }

            console.log('✅ Email sent successfully:', {
                to: options.to,
                subject: options.subject,
                emailId: result.data.id
            });
        } catch (error: any) {
            console.error('❌ Failed to send email:', {
                error: error?.message || error,
                to: options.to,
                subject: options.subject,
                stack: error?.stack,
                details: error?.response?.data || error?.response || error
            });
            throw new Error(`Failed to send email: ${error?.message || 'Unknown error'}`);
        }
    }

    /**
     * Send an invite email
     */
    static async sendInviteEmail(
        email: string,
        token: string,
        roleName: string,
        organizationName?: string
    ): Promise<void> {
        const baseUrl = env.PUBLIC_APP_URL || env.ORIGIN || 'http://localhost:5173';
        const inviteLink = `${baseUrl}/invites/accept/${token}`;
        const subject = `You've been invited to join ${organizationName || 'SvelterApp'}`;
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Invitation to SvelterApp</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">SvelterApp</h1>
                </div>
                <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #1f2937; margin-top: 0;">You've been invited!</h2>
                    <p style="color: #4b5563; font-size: 16px;">
                        You've been invited to join <strong>${organizationName || 'SvelterApp'}</strong> as a <strong>${roleName}</strong>.
                    </p>
                    <p style="color: #4b5563; font-size: 16px;">
                        Click the button below to accept the invitation and create your account:
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${inviteLink}" style="display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                            Accept Invitation
                        </a>
                    </div>
                    <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                        Or copy and paste this link into your browser:
                    </p>
                    <p style="color: #667eea; font-size: 14px; word-break: break-all;">
                        ${inviteLink}
                    </p>
                    <p style="color: #9ca3af; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                        This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
                    </p>
                </div>
            </body>
            </html>
        `;

        await this.sendEmail({ to: email, subject, html });
    }

    /**
     * Send password reset email
     */
    static async sendPasswordResetEmail(
        email: string,
        token: string
    ): Promise<void> {
        const baseUrl = env.PUBLIC_APP_URL || env.ORIGIN || 'http://localhost:5173';
        const resetLink = `${baseUrl}/reset-password/${token}`;
        const subject = 'Reset your SvelterApp password';
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Reset Your Password</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">SvelterApp</h1>
                </div>
                <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #1f2937; margin-top: 0;">Reset Your Password</h2>
                    <p style="color: #4b5563; font-size: 16px;">
                        We received a request to reset your password for your SvelterApp account.
                    </p>
                    <p style="color: #4b5563; font-size: 16px;">
                        Click the button below to reset your password:
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetLink}" style="display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                            Reset Password
                        </a>
                    </div>
                    <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                        Or copy and paste this link into your browser:
                    </p>
                    <p style="color: #667eea; font-size: 14px; word-break: break-all;">
                        ${resetLink}
                    </p>
                    <p style="color: #9ca3af; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                        This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
                    </p>
                </div>
            </body>
            </html>
        `;

        await this.sendEmail({ to: email, subject, html });
    }

    /**
     * Send email change confirmation email to old email address
     */
    static async sendEmailChangeConfirmationEmail(
        oldEmail: string,
        newEmail: string,
        token: string
    ): Promise<void> {
        const baseUrl = env.PUBLIC_APP_URL || env.ORIGIN || 'http://localhost:5173';
        const confirmLink = `${baseUrl}/confirm-email-change/${token}`;
        const subject = 'Confirm your email address change';
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Confirm Email Change</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">SvelterApp</h1>
                </div>
                <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #1f2937; margin-top: 0;">Confirm Email Change</h2>
                    <p style="color: #4b5563; font-size: 16px;">
                        We received a request to change your email address from <strong>${oldEmail}</strong> to <strong>${newEmail}</strong>.
                    </p>
                    <p style="color: #4b5563; font-size: 16px;">
                        To confirm this change, please click the button below:
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${confirmLink}" style="display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                            Confirm Email Change
                        </a>
                    </div>
                    <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                        Or copy and paste this link into your browser:
                    </p>
                    <p style="color: #667eea; font-size: 14px; word-break: break-all;">
                        ${confirmLink}
                    </p>
                    <p style="color: #9ca3af; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                        This link will expire in 24 hours. If you didn't request this email change, please ignore this email and your email address will remain unchanged.
                    </p>
                </div>
            </body>
            </html>
        `;

        await this.sendEmail({ to: oldEmail, subject, html });
    }
}
