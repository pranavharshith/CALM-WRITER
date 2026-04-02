const nodemailer = require('nodemailer');

// Create reusable transporter using SMTP
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
    }
});

// Verify transporter configuration
transporter.verify(function (error, success) {
    if (error) {
        console.warn('⚠ Email service not configured properly:', error.message);
        console.warn('OTP emails will be logged to console instead.');
    } else {
        console.log('✓ Email service ready to send messages');
    }
});

/**
 * Send OTP email for password reset
 * @param {string} email - Recipient email address
 * @param {string} otp - 6-digit OTP code
 * @returns {Promise<boolean>} - Success status
 */
async function sendOTPEmail(email, otp) {
    try {
        // Check if SMTP is configured
        if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
            console.log(`[OTP] Email service not configured. OTP will be sent via console in development.`);
            return false;
        }

        const mailOptions = {
            from: process.env.EMAIL_FROM || '"Calm Writer" <noreply@calmwriter.com>',
            to: email,
            subject: 'Your Password Reset OTP - Calm Writer',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {
                            font-family: Georgia, serif;
                            background-color: #fefefd;
                            margin: 0;
                            padding: 0;
                        }
                        .container {
                            max-width: 600px;
                            margin: 40px auto;
                            background: white;
                            border-radius: 8px;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                            overflow: hidden;
                        }
                        .header {
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            padding: 30px;
                            text-align: center;
                        }
                        .header h1 {
                            margin: 0;
                            font-size: 28px;
                            font-weight: normal;
                        }
                        .content {
                            padding: 40px 30px;
                        }
                        .otp-box {
                            background: #f8f9fa;
                            border: 2px dashed #667eea;
                            border-radius: 8px;
                            padding: 20px;
                            text-align: center;
                            margin: 30px 0;
                        }
                        .otp-code {
                            font-size: 36px;
                            font-weight: bold;
                            color: #667eea;
                            letter-spacing: 8px;
                            font-family: 'Courier New', monospace;
                        }
                        .footer {
                            background: #f8f9fa;
                            padding: 20px 30px;
                            text-align: center;
                            color: #6c757d;
                            font-size: 14px;
                        }
                        .warning {
                            color: #dc3545;
                            font-size: 14px;
                            margin-top: 20px;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🌙 Calm Writer</h1>
                        </div>
                        <div class="content">
                            <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
                            <p style="color: #555; line-height: 1.6;">
                                You requested to reset your password. Use the OTP code below to complete the process.
                            </p>
                            <div class="otp-box">
                                <div style="color: #6c757d; font-size: 14px; margin-bottom: 10px;">Your OTP Code</div>
                                <div class="otp-code">${otp}</div>
                                <div style="color: #6c757d; font-size: 12px; margin-top: 10px;">Valid for 10 minutes</div>
                            </div>
                            <p style="color: #555; line-height: 1.6;">
                                Enter this code in the password reset form to set a new password.
                            </p>
                            <p class="warning">
                                ⚠️ If you didn't request this, please ignore this email. Your password will remain unchanged.
                            </p>
                        </div>
                        <div class="footer">
                            <p style="margin: 0;">This is an automated message from Calm Writer.</p>
                            <p style="margin: 5px 0 0 0;">Please do not reply to this email.</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `
Calm Writer - Password Reset OTP

You requested to reset your password. Use the OTP code below to complete the process.

Your OTP Code: ${otp}

This code is valid for 10 minutes.

If you didn't request this, please ignore this email. Your password will remain unchanged.

---
This is an automated message from Calm Writer.
            `.trim()
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✓ OTP email sent to ${email}: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error('Failed to send OTP email:', error);
        // Fallback to console logging
        console.log(`[OTP] Email failed. OTP for ${email}: ${otp}`);
        return false;
    }
}

/**
 * Send welcome email to new users
 * @param {string} email - Recipient email address
 * @param {string} username - User's username
 * @returns {Promise<boolean>} - Success status
 */
async function sendWelcomeEmail(email, username) {
    try {
        if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
            return false;
        }

        const mailOptions = {
            from: process.env.EMAIL_FROM || '"Calm Writer" <noreply@calmwriter.com>',
            to: email,
            subject: 'Welcome to Calm Writer 🌙',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Georgia, serif; background-color: #fefefd; margin: 0; padding: 0; }
                        .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
                        .content { padding: 40px 30px; color: #555; line-height: 1.8; }
                        .footer { background: #f8f9fa; padding: 20px 30px; text-align: center; color: #6c757d; font-size: 14px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1 style="margin: 0; font-size: 32px;">Welcome to Calm Writer</h1>
                        </div>
                        <div class="content">
                            <p>Hi <strong>@${username}</strong>,</p>
                            <p>Welcome to Calm Writer - a minimalist platform for thoughtful writing and reading.</p>
                            <p>We're excited to have you join our community of writers and readers.</p>
                            <p>Start your journey by sharing your first story or exploring what others have written.</p>
                            <p>Happy writing! 🌙</p>
                        </div>
                        <div class="footer">
                            <p style="margin: 0;">Calm Writer - Write with intention, read with purpose</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✓ Welcome email sent to ${email}`);
        return true;
    } catch (error) {
        console.error('Failed to send welcome email:', error);
        return false;
    }
}

/**
 * Initialize email service
 * @returns {boolean} - Success status
 */
function initializeEmailService() {
    try {
        if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
            console.warn('⚠ SMTP credentials not configured');
            return false;
        }

        // Verify transporter is working
        transporter.verify(function (error, success) {
            if (error) {
                console.warn('⚠ Email service verification failed:', error.message);
            } else {
                console.log('✓ Email service ready');
            }
        });

        return true;
    } catch (error) {
        console.error('Email service initialization error:', error);
        return false;
    }
}

/**
 * Send email verification link
 * @param {string} email - Recipient email
 * @param {string} token - Verification token
 * @returns {Promise<boolean>}
 */
async function sendVerificationEmail(email, token) {
    try {
        if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
            console.log(`[VERIFY] Email service not configured. Token for ${email}: ${token}`);
            return false;
        }

        const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;

        const mailOptions = {
            from: process.env.EMAIL_FROM || '"Calm Writer" <noreply@calmwriter.com>',
            to: email,
            subject: 'Verify your email - Calm Writer',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Georgia, serif; background-color: #fefefd; margin: 0; padding: 0; }
                        .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
                        .content { padding: 40px 30px; color: #555; line-height: 1.8; }
                        .btn { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 20px 0; }
                        .footer { background: #f8f9fa; padding: 20px 30px; text-align: center; color: #6c757d; font-size: 14px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1 style="margin: 0; font-size: 32px;">Verify Email</h1>
                        </div>
                        <div class="content">
                            <p>Welcome to Calm Writer!</p>
                            <p>Please click the button below to verify your email address and activate your account.</p>
                            <div style="text-align: center;">
                                <a href="${verifyUrl}" class="btn">Verify Email</a>
                            </div>
                            <p style="font-size: 12px; color: #999;">Or copy this link: <br>${verifyUrl}</p>
                        </div>
                        <div class="footer">
                            <p style="margin: 0;">Calm Writer - Write with intention</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✓ Verification email sent to ${email}`);
        return true;
    } catch (error) {
        console.error('Failed to send verification email:', error);
        return false;
    }
}

module.exports = {
    initializeEmailService,
    sendOTPEmail,
    sendWelcomeEmail,
    sendVerificationEmail,
    transporter
};
