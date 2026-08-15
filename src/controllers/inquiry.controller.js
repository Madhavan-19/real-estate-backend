const asyncHandler = require('../utils/asyncHandler');
const inquiryService = require('../services/inquiry.service');

const createInquiry = asyncHandler(async (req, res) => {
  const data = await inquiryService.createInquiry({
    propertyId: req.params.id || req.body.propertyId,
    ...req.body,
    userId: req.user?.id || null,
    ip: req.ip,
  });

  res.status(201).json({
    success: true,
    data,
    message: 'Inquiry submitted successfully',
  });
});

const myPropertyInquiries = asyncHandler(async (req, res) => {
  const data = await inquiryService.myPropertyInquiries(req.user.id);

  res.json({
    success: true,
    data,
  });
});

module.exports = {
  createInquiry,
  myPropertyInquiries,
};