const nodemailer = require('nodemailer');

// Create transporter with secure settings
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Function to send OTP email
async function sendOTPEmail(recipientEmail, otp) {
    try {
        const mailOptions = {
            from: {
                name: 'RentEase Support',
                address: process.env.GMAIL_USER
            },
            to: recipientEmail,
            subject: 'Password Reset OTP - RentEase',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2c3e50; text-align: center; margin-bottom: 20px;">Password Reset Request</h2>
                    
                    <div style="background-color: #f8f9fa; border-radius: 5px; padding: 20px; margin-bottom: 20px;">
                        <p style="margin-bottom: 15px;">You have requested to reset your password for your RentEase account.</p>
                        
                        <div style="background-color: #ffffff; border-radius: 5px; padding: 15px; text-align: center;">
                            <h3 style="color: #2c3e50; margin-bottom: 10px;">Your OTP Code:</h3>
                            <p style="font-size: 24px; font-weight: bold; color: #3498db; letter-spacing: 2px; margin: 0;">
                                ${otp}
                            </p>
                        </div>
                        
                        <p style="color: #e74c3c; margin-top: 15px; text-align: center;">
                            This OTP will expire in 10 minutes
                        </p>
                    </div>
                    
                    <div style="background-color: #fff3cd; border-radius: 5px; padding: 15px; margin-bottom: 20px;">
                        <p style="color: #856404; margin: 0;">
                            ⚠️ If you didn't request this password reset, please ignore this email and make sure your account is secure.
                        </p>
                    </div>
                    
                    <hr style="border: 1px solid #eee; margin: 20px 0;">
                    
                    <p style="color: #7f8c8d; font-size: 12px; text-align: center;">
                        This is an automated message from RentEase. Please do not reply to this email.
                    </p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('OTP Email sent successfully:', {
            to: recipientEmail,
            messageId: info.messageId
        });
        return true;
    } catch (error) {
        console.error('Failed to send OTP email:', error);
        return false;
    }
}

// Function to verify email configuration
async function verifyEmailConfig() {
    try {
        await transporter.verify();
        console.log('Email configuration verified successfully');
        return true;
    } catch (error) {
        console.error('Email configuration error:', error);
        console.error('Please ensure:');
        console.error('1. You have enabled 2-Step Verification in your Google Account');
        console.error('2. You have generated an App Password for Gmail');
        console.error('3. Your .env file contains the correct GMAIL_USER and GMAIL_PASS');
        return false;
    }
}

module.exports = {
    sendOTPEmail,
    verifyEmailConfig
};