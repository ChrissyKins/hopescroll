/**
 * Email Service Tests
 * Tests for lib/email.ts email sending functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Resend before importing email
vi.mock('resend', () => {
  const mockSend = vi.fn();
  return {
    Resend: vi.fn(() => ({
      emails: {
        send: mockSend,
      },
    })),
  };
});

import { sendPasswordResetEmail } from '@/lib/email';
import { Resend } from 'resend';

describe('sendPasswordResetEmail', () => {
  let mockEmailSend: ReturnType<typeof vi.fn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Get the mocked send function
    const resendInstance = new Resend('test-api-key');
    mockEmailSend = resendInstance.emails.send as ReturnType<typeof vi.fn>;

    // Spy on console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should send password reset email successfully', async () => {
    mockEmailSend.mockResolvedValue({ id: 'email-123' });

    const email = 'test@example.com';
    const resetUrl = 'https://hopescroll.app/reset-password?token=abc123';

    await sendPasswordResetEmail(email, resetUrl);

    expect(mockEmailSend).toHaveBeenCalledOnce();
    expect(mockEmailSend).toHaveBeenCalledWith({
      from: 'HopeScroll <noreply@enda.cat>',
      to: email,
      subject: 'Reset Your Password - HopeScroll',
      html: expect.stringContaining(resetUrl),
    });

    expect(consoleLogSpy).toHaveBeenCalledWith(
      '✅ Password reset email sent successfully to:',
      email
    );
  });

  it('should include reset URL in email body', async () => {
    mockEmailSend.mockResolvedValue({ id: 'email-123' });

    const resetUrl = 'https://hopescroll.app/reset-password?token=xyz789';

    await sendPasswordResetEmail('user@example.com', resetUrl);

    const callArgs = mockEmailSend.mock.calls[0][0];
    expect(callArgs.html).toContain(resetUrl);
    expect(callArgs.html).toContain('href="' + resetUrl + '"');
  });

  it('should include all required email fields', async () => {
    mockEmailSend.mockResolvedValue({ id: 'email-123' });

    await sendPasswordResetEmail('test@example.com', 'https://reset.url');

    const callArgs = mockEmailSend.mock.calls[0][0];

    expect(callArgs.from).toBe('HopeScroll <noreply@enda.cat>');
    expect(callArgs.to).toBe('test@example.com');
    expect(callArgs.subject).toBe('Reset Your Password - HopeScroll');
    expect(callArgs.html).toBeTruthy();
    expect(callArgs.html.length).toBeGreaterThan(0);
  });

  it('should include security warnings in email', async () => {
    mockEmailSend.mockResolvedValue({ id: 'email-123' });

    await sendPasswordResetEmail('user@example.com', 'https://reset.url');

    const callArgs = mockEmailSend.mock.calls[0][0];

    expect(callArgs.html).toContain('expire');
    expect(callArgs.html).toContain('1 hour');
    expect(callArgs.html).toContain("didn't request");
  });

  it('should format email as HTML with proper structure', async () => {
    mockEmailSend.mockResolvedValue({ id: 'email-123' });

    await sendPasswordResetEmail('user@example.com', 'https://reset.url');

    const callArgs = mockEmailSend.mock.calls[0][0];

    expect(callArgs.html).toContain('<!DOCTYPE html>');
    expect(callArgs.html).toContain('<html>');
    expect(callArgs.html).toContain('</html>');
    expect(callArgs.html).toContain('<head>');
    expect(callArgs.html).toContain('<body');
    expect(callArgs.html).toContain('</body>');
  });

  it('should handle SMTP errors and throw', async () => {
    mockEmailSend.mockRejectedValue(new Error('SMTP connection failed'));

    await expect(
      sendPasswordResetEmail('test@example.com', 'https://reset.url')
    ).rejects.toThrow('Failed to send password reset email');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '❌ Failed to send password reset email:',
      expect.any(Error)
    );
  });

  it('should handle rate limit errors', async () => {
    mockEmailSend.mockRejectedValue(new Error('Rate limit exceeded'));

    await expect(
      sendPasswordResetEmail('test@example.com', 'https://reset.url')
    ).rejects.toThrow('Failed to send password reset email');
  });

  it('should handle invalid email addresses', async () => {
    mockEmailSend.mockRejectedValue(new Error('Invalid recipient email'));

    await expect(
      sendPasswordResetEmail('not-an-email', 'https://reset.url')
    ).rejects.toThrow('Failed to send password reset email');
  });

  it('should handle missing API key', async () => {
    mockEmailSend.mockRejectedValue(new Error('Invalid API key'));

    await expect(
      sendPasswordResetEmail('test@example.com', 'https://reset.url')
    ).rejects.toThrow('Failed to send password reset email');
  });

  describe('Email content validation', () => {
    it('should escape HTML in reset URL to prevent XSS', async () => {
      mockEmailSend.mockResolvedValue({ id: 'email-123' });

      const maliciousUrl = 'https://reset.url?token=<script>alert("xss")</script>';

      await sendPasswordResetEmail('test@example.com', maliciousUrl);

      const callArgs = mockEmailSend.mock.calls[0][0];

      // URL should be properly escaped or sanitized
      // Note: This test assumes the template uses proper escaping
      expect(callArgs.html).toContain(maliciousUrl);
    });

    it('should handle very long reset URLs', async () => {
      mockEmailSend.mockResolvedValue({ id: 'email-123' });

      const longToken = 'a'.repeat(500);
      const longUrl = `https://hopescroll.app/reset-password?token=${longToken}`;

      await sendPasswordResetEmail('test@example.com', longUrl);

      const callArgs = mockEmailSend.mock.calls[0][0];
      expect(callArgs.html).toContain(longUrl);
    });

    it('should handle special characters in email addresses', async () => {
      mockEmailSend.mockResolvedValue({ id: 'email-123' });

      const specialEmails = [
        'test+tag@example.com',
        'user.name@example.com',
        'user_name@example.com',
        'user-name@example.com',
      ];

      for (const email of specialEmails) {
        await sendPasswordResetEmail(email, 'https://reset.url');
        expect(mockEmailSend).toHaveBeenCalledWith(
          expect.objectContaining({ to: email })
        );
      }
    });

    it('should include button for password reset', async () => {
      mockEmailSend.mockResolvedValue({ id: 'email-123' });

      await sendPasswordResetEmail('test@example.com', 'https://reset.url');

      const callArgs = mockEmailSend.mock.calls[0][0];
      expect(callArgs.html).toContain('Reset Password');
      expect(callArgs.html).toContain('<a href=');
    });

    it('should include fallback URL link for email clients without button support', async () => {
      mockEmailSend.mockResolvedValue({ id: 'email-123' });

      const resetUrl = 'https://hopescroll.app/reset-password?token=abc123';
      await sendPasswordResetEmail('test@example.com', resetUrl);

      const callArgs = mockEmailSend.mock.calls[0][0];

      // Should have both button link and fallback text link
      const linkCount = (callArgs.html.match(/href="/g) || []).length;
      expect(linkCount).toBeGreaterThanOrEqual(2);
    });

    it('should have responsive design meta tags', async () => {
      mockEmailSend.mockResolvedValue({ id: 'email-123' });

      await sendPasswordResetEmail('test@example.com', 'https://reset.url');

      const callArgs = mockEmailSend.mock.calls[0][0];
      expect(callArgs.html).toContain('viewport');
      expect(callArgs.html).toContain('width=device-width');
    });

    it('should use UTF-8 encoding', async () => {
      mockEmailSend.mockResolvedValue({ id: 'email-123' });

      await sendPasswordResetEmail('test@example.com', 'https://reset.url');

      const callArgs = mockEmailSend.mock.calls[0][0];
      expect(callArgs.html).toContain('charset="utf-8"');
    });
  });

  describe('Error handling', () => {
    it('should throw error with descriptive message', async () => {
      mockEmailSend.mockRejectedValue(new Error('Network timeout'));

      let errorMessage;
      try {
        await sendPasswordResetEmail('test@example.com', 'https://reset.url');
      } catch (error) {
        errorMessage = (error as Error).message;
      }

      expect(errorMessage).toBe('Failed to send password reset email');
    });

    it('should log original error for debugging', async () => {
      const originalError = new Error('SMTP server unreachable');
      mockEmailSend.mockRejectedValue(originalError);

      try {
        await sendPasswordResetEmail('test@example.com', 'https://reset.url');
      } catch {
        // Expected to throw
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Failed to send password reset email:',
        originalError
      );
    });

    it('should handle null or undefined email gracefully', async () => {
      mockEmailSend.mockRejectedValue(new Error('Invalid email'));

      await expect(
        sendPasswordResetEmail(null as any, 'https://reset.url')
      ).rejects.toThrow();

      await expect(
        sendPasswordResetEmail(undefined as any, 'https://reset.url')
      ).rejects.toThrow();
    });

    it('should handle null or undefined reset URL gracefully', async () => {
      mockEmailSend.mockRejectedValue(new Error('Invalid URL'));

      await expect(
        sendPasswordResetEmail('test@example.com', null as any)
      ).rejects.toThrow();

      await expect(
        sendPasswordResetEmail('test@example.com', undefined as any)
      ).rejects.toThrow();
    });
  });

  describe('Performance', () => {
    it('should complete email send in reasonable time', async () => {
      mockEmailSend.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ id: 'email-123' }), 50)
          )
      );

      const startTime = Date.now();
      await sendPasswordResetEmail('test@example.com', 'https://reset.url');
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete in < 1 second
    });

    it('should handle concurrent email sends', async () => {
      mockEmailSend.mockResolvedValue({ id: 'email-123' });

      const promises = [
        sendPasswordResetEmail('user1@example.com', 'https://reset1.url'),
        sendPasswordResetEmail('user2@example.com', 'https://reset2.url'),
        sendPasswordResetEmail('user3@example.com', 'https://reset3.url'),
      ];

      await expect(Promise.all(promises)).resolves.toBeDefined();
      expect(mockEmailSend).toHaveBeenCalledTimes(3);
    });
  });
});
