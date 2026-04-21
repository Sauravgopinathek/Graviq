const nodemailer = require('nodemailer');

const appUrl = process.env.APP_URL || 'http://localhost:5173';
const isProduction = process.env.NODE_ENV === 'production';
const hasMailConfig = Boolean(process.env.GMAIL_USER && process.env.GMAIL_PASS);

const transporter = hasMailConfig
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    })
  : null;

function logFallback(label, details) {
  console.log(`\n=== ${label} ===\n${details}\n================\n`);
}

async function sendMail(mailOptions, { label, fallbackDetails, testValue = null, required = false } = {}) {
  if (!transporter) {
    if (fallbackDetails && !isProduction) {
      logFallback(label, fallbackDetails);
      return { channel: 'console', testValue };
    }

    if (required) {
      throw new Error('Email delivery is not configured');
    }

    return { channel: 'disabled' };
  }

  try {
    await transporter.sendMail(mailOptions);
    return { channel: 'email' };
  } catch (error) {
    console.error(`Error sending ${label || 'email'}:`, error);

    if (!isProduction && fallbackDetails) {
      logFallback(label, fallbackDetails);
      return { channel: 'console', testValue };
    }

    if (required) {
      throw error;
    }

    return { channel: 'failed' };
  }
}

async function sendVerificationEmail(toEmail, token, userId) {
  const verifyLink = `${appUrl}/verify-email?token=${token}&id=${userId}`;
  const mailOptions = {
    from: `"Graviq Support" <${process.env.GMAIL_USER || 'noreply@graviq.local'}>`,
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

  return sendMail(mailOptions, {
    label: 'VERIFY EMAIL LINK',
    fallbackDetails: `Email: ${toEmail}\nLink: ${verifyLink}`,
  });
}

async function sendLoginAlertEmail(toEmail) {
  const time = new Date().toLocaleString();
  const mailOptions = {
    from: `"Graviq Security" <${process.env.GMAIL_USER || 'noreply@graviq.local'}>`,
    to: toEmail,
    subject: 'New sign-in to your Graviq Account',
    html: `
      <h2>Security Alert</h2>
      <p>We noticed a new sign-in to your Graviq account at <strong>${time}</strong>.</p>
      <p>If this was you, you don't need to do anything. If you don't recognize this activity, please reset your password immediately.</p>
    `,
  };

  return sendMail(mailOptions, {
    label: 'LOGIN ALERT',
    fallbackDetails: `Email: ${toEmail}\nTime: ${time}`,
    required: false,
  });
}

async function sendPasswordResetEmail(toEmail, token, userId) {
  const resetLink = `${appUrl}/reset-password?id=${userId}&token=${token}`;
  const mailOptions = {
    from: `"Graviq Support" <${process.env.GMAIL_USER || 'noreply@graviq.local'}>`,
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

  return sendMail(mailOptions, {
    label: 'PASSWORD RESET LINK',
    fallbackDetails: `Email: ${toEmail}\nLink: ${resetLink}`,
    testValue: resetLink,
    required: true,
  });
}

async function sendOtpEmail(toEmail, otp, purpose = 'login') {
  const purposeLabel = purpose === 'signup' ? 'finish creating your account' : 'complete your sign-in';
  const mailOptions = {
    from: `"Graviq Security" <${process.env.GMAIL_USER || 'noreply@graviq.local'}>`,
    to: toEmail,
    subject: purpose === 'signup' ? 'Your Graviq signup verification code' : 'Your Graviq sign-in verification code',
    html: `
      <h2>Your verification code</h2>
      <p>Use the code below to ${purposeLabel}:</p>
      <div style="display:inline-block;padding:12px 18px;font-size:28px;font-weight:700;letter-spacing:6px;background:#111128;color:#F0F0F8;border-radius:8px;border:1px solid rgba(108,92,231,0.35);">
        ${otp}
      </div>
      <p>This code expires in 10 minutes.</p>
      <p>If you did not request this code, secure your account immediately.</p>
    `,
  };

  return sendMail(mailOptions, {
    label: 'OTP CODE',
    fallbackDetails: `Email: ${toEmail}\nPurpose: ${purpose}\nCode: ${otp}`,
    testValue: otp,
    required: true,
  });
}

module.exports = {
  sendVerificationEmail,
  sendLoginAlertEmail,
  sendOtpEmail,
  sendPasswordResetEmail,
};
