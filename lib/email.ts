import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  try {
    await resend.emails.send({
      from: 'HopeScroll <noreply@enda.cat>',
      to: email,
      subject: 'Reset Your Password - HopeScroll',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f9fafb; border-radius: 8px; padding: 32px; margin-bottom: 24px;">
              <h1 style="color: #111827; margin: 0 0 16px 0; font-size: 24px; font-weight: 700;">Reset Your Password</h1>
              <p style="color: #4b5563; margin: 0 0 24px 0;">You requested to reset your password for your HopeScroll account. Click the button below to set a new password:</p>

              <a href="${resetUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: 600; margin-bottom: 24px;">Reset Password</a>

              <p style="color: #6b7280; font-size: 14px; margin: 24px 0 0 0;">
                Or copy and paste this URL into your browser:<br>
                <a href="${resetUrl}" style="color: #2563eb; word-break: break-all;">${resetUrl}</a>
              </p>
            </div>

            <div style="color: #6b7280; font-size: 14px;">
              <p style="margin: 0 0 8px 0;"><strong>This link will expire in 1 hour.</strong></p>
              <p style="margin: 0 0 8px 0;">If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
              <p style="margin: 0; color: #9ca3af;">
                — HopeScroll
              </p>
            </div>
          </body>
        </html>
      `,
    });

    console.log('✅ Password reset email sent successfully to:', email);
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
}
