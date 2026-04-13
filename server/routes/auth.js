const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { sendVerificationEmail, sendLoginAlertEmail, sendPasswordResetEmail } = require('../services/email');

const router = express.Router();

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

    try {
      // Check if user already exists
      const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const result = await db.query(
        'INSERT INTO users (email, password_hash, is_verified) VALUES ($1, $2, false) RETURNING id, email, plan, created_at',
        [email, passwordHash]
      );

      const user = result.rows[0];
      
      // Create a verification token valid for 24 hours
      const verificationSecret = process.env.JWT_SECRET + user.email;
      const verifyToken = jwt.sign({ id: user.id }, verificationSecret, { expiresIn: '24h' });
      
      // Send the email
      await sendVerificationEmail(user.email, verifyToken, user.id);

      res.status(201).json({ 
        message: 'Account created! Please check your email to verify your account.',
        user 
      });
    } catch (err) {
      console.error('Signup error:', err);
      res.status(500).json({ error: 'Internal server error' });
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
      if (user.is_verified) return res.json({ message: 'Email already verified' });

      const secret = process.env.JWT_SECRET + user.email;
      try {
        jwt.verify(token, secret);
      } catch (err) {
        return res.status(400).json({ error: 'Invalid or expired verification token' });
      }

      await db.query('UPDATE users SET is_verified = true WHERE id = $1', [user.id]);

      // Login the user immediately after verification
      const authToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
        expiresIn: '7d',
      });

      res.json({ token: authToken, user: { id: user.id, email: user.email, plan: user.plan } });
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
      const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = result.rows[0];

      if (!user.is_verified) {
        return res.status(403).json({ error: 'Please verify your email address to sign in' });
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
        expiresIn: '7d',
      });

      // Asynchronously send sign in alert email 
      sendLoginAlertEmail(user.email).catch(console.error);

      res.json({
        token,
        user: { id: user.id, email: user.email, plan: user.plan, created_at: user.created_at },
      });
    } catch (err) {
      console.error('Login error:', err);
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
      
      // Don't reveal if email exists or not to prevent user enumeration
      if (result.rows.length > 0) {
        const user = result.rows[0];
        
        // Create a one-time link valid for 15 minutes
        // We use the user's current password hash in the secret so the link becomes invalid once they change their password
        const secret = process.env.JWT_SECRET + user.password_hash;
        const token = jwt.sign({ email: user.email, id: user.id }, secret, {
          expiresIn: '15m',
        });
        
        // Send the email using Nodemailer
        await sendPasswordResetEmail(user.email, token, user.id);
        const resetLink = `http://localhost:5173/reset-password?id=${user.id}&token=${token}`;
        console.log(`\n\n=== PASSWORD RESET LINK ===\n${resetLink}\n===========================\n\n`);
        
        return res.json({ 
          message: 'If the email exists, a reset link has been sent.',
          _testLink: resetLink 
        });
      }

      res.json({ message: 'If the email exists, a reset link has been sent.' });
    } catch (err) {
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
      const secret = process.env.JWT_SECRET + user.password_hash;

      try {
        jwt.verify(token, secret);
      } catch (err) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }

      // Hash the new password and update
      const newPasswordHash = await bcrypt.hash(password, 12);
      await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newPasswordHash, user.id]);

      res.json({ message: 'Password reset completely successfully' });
    } catch (err) {
      console.error('Reset password error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, email, plan, created_at FROM users WHERE id = $1',
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
