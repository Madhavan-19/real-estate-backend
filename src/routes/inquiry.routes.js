const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate.middleware');
const { requireAuth, optionalAuth } = require('../middleware/auth.middleware');
const { inquiryLimiter } = require('../middleware/rateLimiter.middleware');
const ctrl = require('../controllers/inquiry.controller');

const router = express.Router();

/**
 * @openapi
 * /inquiries:
 *   post:
 *     tags: [Inquiries]
 *     summary: Submit an inquiry/lead on a property (guests allowed, rate-limited)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [propertyId, name, email, phone]
 *             properties:
 *               propertyId: { type: string, format: uuid }
 *               name: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *               message: { type: string }
 *     responses:
 *       201: { description: Inquiry recorded }
 *       409: { description: Duplicate inquiry for this property today }
 *       429: { description: Rate limited }
 */
router.post(
  '/',
  inquiryLimiter,
  optionalAuth,
  [
    body('propertyId').isUUID(),
    body('name').trim().notEmpty(),
    body('email').isEmail().normalizeEmail(),
    body('phone').notEmpty(),
    body('message').optional().isLength({ max: 1000 }),
  ],
  validate,
  ctrl.createInquiry
);

/**
 * @openapi
 * /inquiries/mine:
 *   get:
 *     tags: [Inquiries]
 *     summary: Get inquiries received on the authenticated user's own listings
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Inquiries list }
 */
router.get('/mine', requireAuth, ctrl.myPropertyInquiries);

module.exports = router;
