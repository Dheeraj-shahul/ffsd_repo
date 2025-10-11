require('dotenv').config();
const { verifyEmailConfig, sendOTPEmail } = require('./utils/emailUtils');

async function testEmailSetup() {
    console.log('Testing email configuration...');
    console.log('Gmail User:', process.env.GMAIL_USER);
    
    // First, verify the configuration
    const isConfigValid = await verifyEmailConfig();
    if (!isConfigValid) {
        console.error('Email configuration test failed!');
        return;
    }

    // Test sending an OTP email
    console.log('\nTesting OTP email sending...');
    const testEmail = process.env.GMAIL_USER; // Use your email for testing
    const testOtp = '123456';
    
    const sent = await sendOTPEmail(testEmail, testOtp);
    if (sent) {
        console.log('\n✅ Test successful!');
        console.log('Check your email inbox for the test OTP message');
    } else {
        console.error('\n❌ Test failed!');
        console.log('Check the error messages above for details');
    }
}

// Run the test
testEmailSetup().catch(console.error);