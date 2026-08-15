const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate.middleware');
const { requireAuth, optionalAuth } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/property.controller');
const upload = require('../middleware/upload');

const router = express.Router();

/**
 * @openapi
 * /properties:
 *   get:
 *     tags: [Properties]
 *     summary: List properties with search, filters, sorting and pagination
 *     parameters:
 *       - in: query
 *         name: city
 *         schema: { type: string }
 *       - in: query
 *         name: propertyType
 *         schema: { type: string, enum: [apartment, villa, plot, office, pg] }
 *       - in: query
 *         name: listingType
 *         schema: { type: string, enum: [sale, rent] }
 *       - in: query
 *         name: minPrice
 *         schema: { type: number }
 *       - in: query
 *         name: maxPrice
 *         schema: { type: number }
 *       - in: query
 *         name: bedrooms
 *         schema: { type: integer }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Full text search across title/locality/city/description
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [newest, oldest, price_asc, price_desc] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 12, maximum: 50 }
 *     responses:
 *       200: { description: Paginated list of properties }
 */
router.get('/', ctrl.listProperties);

/**
 * @openapi
 * /properties/mine:
 *   get:
 *     tags: [Properties]
 *     summary: List the authenticated user's own listings
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Owned listings }
 */
router.get('/mine', requireAuth, ctrl.myListings);

/**
 * @openapi
 * /properties/my-listings:
 *   get:
 *     tags: [Properties]
 *     summary: List the authenticated user's own listings
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Owned listings }
 */
router.get('/my-listings', requireAuth, ctrl.myListings);

/**
 * @openapi
 * /properties/{slug}:
 *   get:
 *     tags: [Properties]
 *     summary: Get property details by ID or slug
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Property detail }
 *       404: { description: Not found }
 */
router.get('/:slug', optionalAuth, ctrl.getPropertyBySlug);

/**
 * @openapi
 * /properties/{slug}/similar:
 *   get:
 *     tags: [Properties]
 *     summary: Get similar properties (same city + type, closest price)
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Up to 6 similar listings }
 */
router.get('/:slug/similar', ctrl.similarProperties);

const inquiryCtrl = require('../controllers/inquiry.controller');
const { inquiryLimiter } = require('../middleware/rateLimiter.middleware');

/**
 * @openapi
 * /properties/{id}/inquiries:
 *   post:
 *     tags: [Inquiries]
 *     summary: Submit an inquiry/lead on a property by ID or slug
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, phone]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *               message: { type: string }
 *     responses:
 *       201: { description: Inquiry recorded }
 *       409: { description: Duplicate inquiry }
 *       429: { description: Rate limited }
 */
router.post(
  '/:id/inquiries',
  inquiryLimiter,
  optionalAuth,
  [
    body('name').trim().notEmpty(),
    body('email').isEmail().normalizeEmail(),
    body('phone').notEmpty(),
    body('message').optional().isLength({ max: 1000 }),
  ],
  validate,
  inquiryCtrl.createInquiry
);

const propertyBody = [
  body('title').trim().notEmpty().isLength({ max: 200 }),
  body('description').trim().notEmpty(),
  body('propertyType').isIn(['apartment', 'villa', 'plot', 'office', 'pg']),
  body('listingType').optional().isIn(['sale', 'rent']),
  body('price').isFloat({ gt: 0 }),
  body('city').trim().notEmpty(),
  body('bedrooms').optional().isInt({ min: 0 }),
  body('bathrooms').optional().isInt({ min: 0 }),
  body('areaSqft').optional().isFloat({ gt: 0 }),
  // body('images').optional().isArray(),
  // body('amenities').optional().isArray(),
];

/**
 * @openapi
 * /properties:
 *   post:
 *     tags: [Properties]
 *     summary: Create a property listing (authenticated)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description, propertyType, price, city]
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               propertyType: { type: string }
 *               listingType: { type: string }
 *               price: { type: number }
 *               city: { type: string }
 *               locality: { type: string }
 *               bedrooms: { type: integer }
 *               bathrooms: { type: integer }
 *               areaSqft: { type: number }
 *               images: { type: array, items: { type: object } }
 *               amenities: { type: array, items: { type: string } }
 *     responses:
 *       201: { description: Listing created }
 */
router.post('/', requireAuth,upload.array('images',10), propertyBody, validate, ctrl.createProperty);

/**
 * @openapi
 * /properties/{id}:
 *   put:
 *     tags: [Properties]
 *     summary: Update own property listing
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Updated listing }
 *       403: { description: Not the owner }
 *       404: { description: Not found }
 */
router.put(
  '/:id',
  requireAuth,
   upload.array('images', 10),
  [param('id').isUUID()],
  validate,
  ctrl.updateProperty
);

/**
 * @openapi
 * /properties/{id}:
 *   delete:
 *     tags: [Properties]
 *     summary: Delete own property listing
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Deleted }
 *       403: { description: Not the owner }
 *       404: { description: Not found }
 */
router.delete('/:id', requireAuth, [param('id').isUUID()], validate, ctrl.deleteProperty);

module.exports = router;
