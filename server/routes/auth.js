const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const {
  sendVerificationEmail,
  sendLoginAlertEmail,
  sendOtpEmail,
  sendPasswordResetEmail,
} = require('../services/email');
const {
  OTP_LENGTH,
  OTP_MAX_ATTEMPTS,
  generateOtp,
  getOtpExpiryDate,
  hashOtp,
  isOtpExpired,
} = require('../services/otp');

const router = express.Router();
const appUrl = process.env.APP_URL || 'http://localhost:5173';
const googleClient = process.env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
  : null;
const DEMO_LOGIN_EMAIL = (process.env.DEMO_LOGIN_EMAIL || 'demo@graviq.dev').toLowerCase();
const DEMO_LOGIN_PASSWORD = process.env.DEMO_LOGIN_PASSWORD || 'Demo1234!';

function createAuthToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
}

async function ensureDemoUser() {
  const passwordHash = await bcrypt.hash(DEMO_LOGIN_PASSWORD, 12);
  const result = await db.query(
    `INSERT INTO users (email, password_hash, is_verified)
     VALUES ($1, $2, true)
     ON CONFLICT (email)
     DO UPDATE SET password_hash = EXCLUDED.password_hash, is_verified = true
     RETURNING id, email, plan, created_at`,
    [DEMO_LOGIN_EMAIL, passwordHash]
  );

  return result.rows[0];
}

async function verifyGoogleCredential(credential) {
  if (!googleClient || !process.env.GOOGLE_CLIENT_ID) {
    throw new Error('Google OAuth is not configured');
  }

  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  if (!payload?.sub || !payload?.email) {
    throw new Error('Invalid Google account data');
  }

  if (!payload.email_verified) {
    throw new Error('Google email is not verified');
  }

  return payload;
}

function getOtpChallengeMessage(purpose, deliveryChannel) {
  const baseMessage =
    purpose === 'signup'
      ? 'We sent a verification code to your email. Enter it to finish setting up your account.'
      : 'We sent a verification code to your email. Enter it to complete sign-in.';

  if (deliveryChannel === 'console') {
    return `${baseMessage} Email is not configured in this environment, so the code was logged on the server console.`;
  }

  return baseMessage;
}

async function createOtpChallenge({
  userId,
  purpose,
  challengeId = null,
  queryable = db,
}) {
  const otp = generateOtp();
  const otpHash = hashOtp(otp);
  const expiresAt = getOtpExpiryDate();

  if (challengeId) {
    const result = await queryable.query(
      `UPDATE auth_otp_challenges
       SET otp_hash = $1, expires_at = $2, attempts = 0, consumed_at = NULL, updated_at = NOW()
       WHERE id = $3 AND user_id = $4
       RETURNING id, purpose, expires_at`,
      [otpHash, expiresAt, challengeId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('OTP challenge not found');
    }

    return { otp, challenge: result.rows[0] };
  }

  await queryable.query(
    `UPDATE auth_otp_challenges
     SET consumed_at = NOW(), updated_at = NOW()
     WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL`,
    [userId, purpose]
  );

  const result = await queryable.query(
    `INSERT INTO auth_otp_challenges (user_id, purpose, otp_hash, max_attempts, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, purpose, expires_at`,
    [userId, purpose, otpHash, OTP_MAX_ATTEMPTS, expiresAt]
  );

  return { otp, challenge: result.rows[0] };
}

function formatOtpResponse({ challenge, email, delivery }) {
  const response = {
    requiresOtp: true,
    challengeId: challenge.id,
    purpose: challenge.purpose,
    email,
    expiresAt: challenge.expires_at,
    delivery: delivery.channel,
    message: getOtpChallengeMessage(challenge.purpose, delivery.channel),
  };

  if (delivery.testValue && process.env.NODE_ENV !== 'production') {
    response._testOtp = delivery.testValue;
  }

  return response;
}

// POST /api/auth/signup
router.post(
  '/signup',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Email already registered' });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, is_verified)
         VALUES ($1, $2, false)
         RETURNING id, email, plan, created_at`,
        [email, passwordHash]
      );

      const user = userResult.rows[0];
      const { otp, challenge } = await createOtpChallenge({
        userId: user.id,
        purpose: 'signup',
        queryable: client,
      });

      await client.query('COMMIT');

      const verificationSecret = process.env.JWT_SECRET + user.email;
      const verifyToken = jwt.sign({ id: user.id }, verificationSecret, { expiresIn: '24h' });

      sendVerificationEmail(user.email, verifyToken, user.id).catch(console.error);
      const delivery = await sendOtpEmail(user.email, otp, 'signup');

      res.status(201).json(formatOtpResponse({ challenge, email: user.email, delivery }));
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});

      if (err.code === '23505') {
        return res.status(409).json({ error: 'Email already registered' });
      }

      if (err.message === 'Email delivery is not configured') {
        return res.status(503).json({ error: 'Signup succeeded, but OTP delivery is not configured on the server.' });
      }

      console.error('Signup error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      client.release();
    }
  }
);

// POST /api/auth/verify-email
router.post(
  '/verify-email',
  [body('id').notEmpty(), body('token').notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { id, token } = req.body;

    try {
      const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
      if (result.rows.length === 0) return res.status(400).json({ error: 'Invalid verification token' });

      const user = result.rows[0];
      const secret = process.env.JWT_SECRET + user.email;

      try {
        jwt.verify(token, secret);
      } catch (err) {
        return res.status(400).json({ error: 'Invalid or expired verification token' });
      }

      if (!user.is_verified) {
        await db.query('UPDATE users SET is_verified = true WHERE id = $1', [user.id]);
      }

      res.json({ message: 'Email verified successfully. You can continue signing in.' });
    } catch (err) {
      console.error('Verify email error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      if (email === DEMO_LOGIN_EMAIL && password === DEMO_LOGIN_PASSWORD) {
        const user = await ensureDemoUser();
        const token = createAuthToken(user);

        sendLoginAlertEmail(user.email).catch(console.error);

        return res.json({
          token,
          user,
        });
      }

      const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = result.rows[0];
      if (!user.password_hash) {
        return res.status(400).json({ error: 'This account uses Google sign-in. Continue with Google instead.' });
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const purpose = user.is_verified ? 'login' : 'signup';
      const { otp, challenge } = await createOtpChallenge({ userId: user.id, purpose });
      const delivery = await sendOtpEmail(user.email, otp, purpose);

      res.json(formatOtpResponse({ challenge, email: user.email, delivery }));
    } catch (err) {
      if (err.message === 'Email delivery is not configured') {
        return res.status(503).json({ error: 'OTP delivery is not configured on the server.' });
      }

      console.error('Login error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/auth/google
router.post(
  '/google',
  [body('credential').notEmpty().withMessage('Google credential is required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const payload = await verifyGoogleCredential(req.body.credential);
      const email = payload.email.toLowerCase();
      const googleId = payload.sub;

      let userResult = await db.query(
        'SELECT id, email, google_id, plan, created_at FROM users WHERE google_id = $1 OR email = $2 ORDER BY created_at ASC LIMIT 1',
        [googleId, email]
      );

      let user = userResult.rows[0];

      if (!user) {
        const passwordHash = await bcrypt.hash(crypto.randomUUID(), 12);
        const created = await db.query(
          `INSERT INTO users (email, google_id, password_hash, is_verified)
           VALUES ($1, $2, $3, true)
           RETURNING id, email, plan, created_at`,
          [email, googleId, passwordHash]
        );
        user = created.rows[0];
      } else if (!user.google_id) {
        const linked = await db.query(
          `UPDATE users
           SET google_id = $1, is_verified = true
           WHERE id = $2
           RETURNING id, email, google_id, plan, created_at`,
          [googleId, user.id]
        );
        user = linked.rows[0];
      } else {
        await db.query('UPDATE users SET is_verified = true WHERE id = $1', [user.id]);
      }

      const token = createAuthToken(user);
      sendLoginAlertEmail(user.email).catch(console.error);

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          plan: user.plan,
          created_at: user.created_at,
        },
      });
    } catch (err) {
      if (err.message === 'Google OAuth is not configured') {
        return res.status(503).json({ error: 'Google sign-in is not configured on the server.' });
      }

      if (err.message === 'Google email is not verified') {
        return res.status(400).json({ error: 'Your Google account email must be verified.' });
      }

      if (err.message === 'Invalid Google account data') {
        return res.status(400).json({ error: 'Invalid Google account data.' });
      }

      if (err.message === 'invalid_token') {
        return res.status(401).json({ error: 'Google rejected the sign-in token. Check your client ID configuration.' });
      }

      if (err.code === '42703') {
        return res.status(500).json({ error: 'Database migration is missing for Google sign-in. Run the auth migration.' });
      }

      console.error('Google auth error:', err);
      res.status(500).json({ error: 'Google sign-in failed on the server.' });
    }
  }
);

// POST /api/auth/verify-otp
router.post(
  '/verify-otp',
  [
    body('challengeId').notEmpty(),
    body('otp')
      .matches(new RegExp(`^\\d{${OTP_LENGTH}}$`))
      .withMessage(`OTP must be a ${OTP_LENGTH}-digit code`),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { challengeId, otp } = req.body;

    try {
      const result = await db.query(
        `SELECT c.*, u.email, u.plan, u.created_at, u.is_verified
         FROM auth_otp_challenges c
         INNER JOIN users u ON u.id = c.user_id
         WHERE c.id = $1`,
        [challengeId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Verification challenge not found' });
      }

      const challenge = result.rows[0];

      if (challenge.consumed_at) {
        return res.status(409).json({ error: 'This verification code has already been used. Request a new code.' });
      }

      if (challenge.attempts >= challenge.max_attempts || isOtpExpired(challenge.expires_at)) {
        return res.status(410).json({ error: 'This verification code has expired. Request a new code.' });
      }

      if (hashOtp(otp) !== challenge.otp_hash) {
        await db.query(
          `UPDATE auth_otp_challenges
           SET attempts = attempts + 1, updated_at = NOW()
           WHERE id = $1`,
          [challenge.id]
        );

        const remainingAttempts = Math.max(challenge.max_attempts - challenge.attempts - 1, 0);
        return res.status(400).json({
          error:
            remainingAttempts > 0
              ? `Invalid verification code. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`
              : 'Invalid verification code. Request a new code.',
        });
      }

      await db.query(
        `UPDATE auth_otp_challenges
         SET consumed_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [challenge.id]
      );

      if (challenge.purpose === 'signup' && !challenge.is_verified) {
        await db.query('UPDATE users SET is_verified = true WHERE id = $1', [challenge.user_id]);
      }

      const user = {
        id: challenge.user_id,
        email: challenge.email,
        plan: challenge.plan,
        created_at: challenge.created_at,
      };

      const token = createAuthToken(user);

      if (challenge.purpose === 'login') {
        sendLoginAlertEmail(challenge.email).catch(console.error);
      }

      res.json({ token, user });
    } catch (err) {
      console.error('Verify OTP error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/auth/resend-otp
router.post(
  '/resend-otp',
  [body('challengeId').notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { challengeId } = req.body;

    try {
      const result = await db.query(
        `SELECT c.id, c.user_id, c.purpose, c.consumed_at, u.email
         FROM auth_otp_challenges c
         INNER JOIN users u ON u.id = c.user_id
         WHERE c.id = $1`,
        [challengeId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Verification challenge not found' });
      }

      const challenge = result.rows[0];

      if (challenge.consumed_at) {
        return res.status(409).json({ error: 'This verification flow is already completed. Sign in again to get a new code.' });
      }

      const { otp, challenge: updatedChallenge } = await createOtpChallenge({
        userId: challenge.user_id,
        purpose: challenge.purpose,
        challengeId: challenge.id,
      });

      const delivery = await sendOtpEmail(challenge.email, otp, challenge.purpose);
      const response = {
        message:
          delivery.channel === 'console'
            ? 'A new verification code was generated and logged on the server console.'
            : 'A new verification code has been sent.',
        challengeId: updatedChallenge.id,
        expiresAt: updatedChallenge.expires_at,
        delivery: delivery.channel,
      };

      if (delivery.testValue && process.env.NODE_ENV !== 'production') {
        response._testOtp = delivery.testValue;
      }

      res.json(response);
    } catch (err) {
      if (err.message === 'Email delivery is not configured') {
        return res.status(503).json({ error: 'OTP delivery is not configured on the server.' });
      }

      console.error('Resend OTP error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/auth/forgot-password
router.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email } = req.body;
      const result = await db.query('SELECT id, email, password_hash FROM users WHERE email = $1', [email]);

      if (result.rows.length > 0) {
        const user = result.rows[0];
        if (!user.password_hash) {
          return res.json({ message: 'If the email exists, a reset link has been sent.' });
        }

        const secret = process.env.JWT_SECRET + user.password_hash;
        const token = jwt.sign({ email: user.email, id: user.id }, secret, {
          expiresIn: '15m',
        });

        const delivery = await sendPasswordResetEmail(user.email, token, user.id);
        const resetLink = `${appUrl}/reset-password?id=${user.id}&token=${token}`;

        console.log(`\n\n=== PASSWORD RESET LINK ===\n${resetLink}\n===========================\n\n`);

        return res.json({
          message: 'If the email exists, a reset link has been sent.',
          delivery: delivery.channel,
          _testLink: delivery.testValue || resetLink,
        });
      }

      res.json({ message: 'If the email exists, a reset link has been sent.' });
    } catch (err) {
      if (err.message === 'Email delivery is not configured') {
        return res.status(503).json({ error: 'Password reset email delivery is not configured on the server.' });
      }

      console.error('Forgot password error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/auth/reset-password
router.post(
  '/reset-password',
  [
    body('id').notEmpty(),
    body('token').notEmpty(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id, token, password } = req.body;

    try {
      const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }

      const user = result.rows[0];
      if (!user.password_hash) {
        return res.status(400).json({ error: 'This account uses Google sign-in. Continue with Google instead.' });
      }

      const secret = process.env.JWT_SECRET + user.password_hash;

      try {
        jwt.verify(token, secret);
      } catch (err) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }

      const newPasswordHash = await bcrypt.hash(password, 12);
      await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newPasswordHash, user.id]);

      res.json({ message: 'Password reset completely successfully' });
    } catch (err) {
      console.error('Reset password error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// DELETE /api/auth/account
router.delete('/account', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM users WHERE id = $1 RETURNING id, email',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Account deleted successfully',
      deletedUser: result.rows[0],
    });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, email, google_id, plan, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
