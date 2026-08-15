const express = require('express');
const authRoutes = require('./auth.routes');
const propertyRoutes = require('./property.routes');
const inquiryRoutes = require('./inquiry.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/properties', propertyRoutes);
router.use('/inquiries', inquiryRoutes);

router.get('/health', (req, res) => res.json({ success: true, status: 'ok', time: new Date().toISOString() }));

module.exports = router;
