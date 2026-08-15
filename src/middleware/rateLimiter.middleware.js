const rateLimit = require('express-rate-limit');

// General API limiter — generous, just to blunt scraping/abuse.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

// Auth endpoints are brute-force targets — much tighter window.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts, please try again later.' },
});

// Inquiry/lead form is the classic spam vector — limit per IP tightly,
// on top of the DB-level per-(property,email,day) unique constraint.
const inquiryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many inquiries submitted. Please try again later.' },
});

module.exports = { apiLimiter, authLimiter, inquiryLimiter };
