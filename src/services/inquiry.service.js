const inquiryModel = require('../model/inquiry.model');
const ApiError = require('../utils/ApiError');

const createInquiry = async (data) => {
  const { propertyId, name, email, phone, message, userId, ip } = data;

  if (!propertyId)
    throw new ApiError(400, 'Property ID is required');

  const property = await inquiryModel.findProperty(propertyId);

  if (!property)
    throw new ApiError(404, 'Property not found');

  const recent = await inquiryModel.findRecentInquiry(email);

  if (recent)
    throw new ApiError(
      429,
      'Please wait a few minutes before submitting another inquiry'
    );

  try {
    return await inquiryModel.create({
      propertyId: property.id,
      userId,
      name,
      email,
      phone,
      message,
      ip,
    });
  } catch (err) {
    if (err.code === '23505')
      throw new ApiError(
        409,
        'You already inquired about this property today'
      );

    throw err;
  }
};

const myPropertyInquiries = async (ownerId) => {
  return inquiryModel.findByOwner(ownerId);
};

module.exports = {
  createInquiry,
  myPropertyInquiries,
};