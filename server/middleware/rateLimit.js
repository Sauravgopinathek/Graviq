/**
 * Simple in-memory rate limiter middleware.
 * No external dependencies (no Redis). Suitable for single-instance deployments.
 */

const rateLimitStores = {};

function createRateLimiter({ windowMs = 60000, maxRequests = 30, message = 'Too many requests, please try again later.' } = {}) {
  const storeName = `${windowMs}-${maxRequests}-${Math.random().toString(36).slice(2, 8)}`;
  rateLimitStores[storeName] = new Map();

  // Cleanup expired entries every windowMs
  const cleanupInterval = setInterval(() => {
    const store = rateLimitStores[storeName];
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now - entry.windowStart > windowMs) {
        store.delete(key);
      }
    }
  }, windowMs);

  // Don't prevent process exit
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return function rateLimitMiddleware(req, res, next) {
    const store = rateLimitStores[storeName];
    const key = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();

    let entry = store.get(key);

    if (!entry || now - entry.windowStart > windowMs) {
      entry = { windowStart: now, count: 0 };
      store.set(key, entry);
    }

    entry.count++;

    // Set rate limit headers
    const remaining = Math.max(0, maxRequests - entry.count);
    const resetTime = Math.ceil((entry.windowStart + windowMs - now) / 1000);
    res.set('X-RateLimit-Limit', String(maxRequests));
    res.set('X-RateLimit-Remaining', String(remaining));
    res.set('X-RateLimit-Reset', String(resetTime));

    if (entry.count > maxRequests) {
      res.set('Retry-After', String(resetTime));
      return res.status(429).json({ error: message });
    }

    next();
  };
}

// Pre-configured limiters for different endpoint types
const authLimiter = createRateLimiter({
  windowMs: 60000,    // 1 minute
  maxRequests: 5,
  message: 'Too many authentication attempts. Please wait a minute before trying again.',
});

const conversationCreateLimiter = createRateLimiter({
  windowMs: 60000,    // 1 minute
  maxRequests: 10,
  message: 'Too many conversations started. Please wait a moment.',
});

const messageLimiter = createRateLimiter({
  windowMs: 60000,   // 1 minute
  maxRequests: 30,
  message: 'Too many messages sent. Please slow down.',
});

const impressionLimiter = createRateLimiter({
  windowMs: 60000,   // 1 minute
  maxRequests: 60,
  message: 'Too many requests.',
});

module.exports = {
  createRateLimiter,
  authLimiter,
  conversationCreateLimiter,
  messageLimiter,
  impressionLimiter,
};
