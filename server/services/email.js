const nodemailer = require('nodemailer');

// Ensure these are set in your .env file
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS, // The app password provided by the user
  },
});

async function sendVerificationEmail(toEmail, token, userId) {
  const verifyLink = `http://localhost:5173/verify-email?token=${token}&id=${userId}`;
  
  const mailOptions = {
    from: `"Graviq Support" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: 'Verify your Graviq Account',
    html: `
      <h2>Welcome to Graviq!</h2>
      <p>Please click the button below to verify your email address and activate your account:</p>
      <a href="${verifyLink}" style="display:inline-block;padding:10px 20px;background:#6C5CE7;color:white;text-decoration:none;border-radius:5px;">Verify Email</a>
      <p>Or copy this link: <br> ${verifyLink}</p>
      <p>If you didn't create this account, you can safely ignore this email.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${toEmail}`);
  } catch (error) {
    console.error('Error sending verification email:', error);
  }
}

async function sendLoginAlertEmail(toEmail) {
  const time = new Date().toLocaleString();
  
  const mailOptions = {
    from: `"Graviq Security" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: 'New sign-in to your Graviq Account',
    html: `
      <h2>Security Alert</h2>
      <p>We noticed a new sign-in to your Graviq account at <strong>${time}</strong>.</p>
      <p>If this was you, you don't need to do anything. If you don't recognize this activity, please reset your password immediately.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Login alert email sent to ${toEmail}`);
  } catch (error) {
    console.error('Error sending login alert email:', error);
  }
}

async function sendPasswordResetEmail(toEmail, token, userId) {
  const resetLink = `http://localhost:5173/reset-password?id=${userId}&token=${token}`;
  
  const mailOptions = {
    from: `"Graviq Support" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: 'Password Reset Request',
    html: `
      <h2>Reset your password</h2>
      <p>We received a request to reset the password for your Graviq account.</p>
      <a href="${resetLink}" style="display:inline-block;padding:10px 20px;background:#6C5CE7;color:white;text-decoration:none;border-radius:5px;">Reset Password</a>
      <p>This link will expire in 15 minutes.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${toEmail}`);
  } catch (error) {
    console.error('Error sending password reset email:', error);
  }
}

module.exports = {
  sendVerificationEmail,
  sendLoginAlertEmail,
  sendPasswordResetEmail
};
