// Email Configuration Example
// Copy this file to email-config.js and update with your actual credentials

module.exports = {
    email: {
        service: 'gmail', // You can change this to your email service (outlook, yahoo, etc.)
        auth: {
            user: 'campusfindthelost@gmail.com', // Replace with your email
            pass: 'wdry stcu smtt rola' // Replace with your app password
        }
    }
};

// Instructions:
// 1. For Gmail:
//    - Enable 2-factor authentication
//    - Generate an App Password: https://myaccount.google.com/apppasswords
//    - Use the App Password instead of your regular password
//
// 2. For other services:
//    - Check your email provider's SMTP settings
//    - Update the service name and credentials accordingly
//
// 3. Security:
//    - Never commit your actual credentials to version control
//    - Use environment variables in production
//    - Consider using a dedicated email service like SendGrid for production
