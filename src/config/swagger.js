const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Real Estate Listing Platform API',
      version: '1.0.0',
      description:
        'API for a scalable real-estate listing platform (auth, properties, search, inquiries).',
    },
    servers: [
      { url: '/api', description: 'Standard API path' },
      { url: '/api/v1', description: 'Versioned API path' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  // JSDoc @openapi comments live directly above each route handler
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJSDoc(options);

