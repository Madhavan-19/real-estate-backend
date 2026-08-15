const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');
const swaggerUi = require('swagger-ui-express');

require('dotenv').config();

const swaggerSpec = require('./config/swagger');
const routes = require('./routes');
const {
  apiLimiter,
} = require('./middleware/rateLimiter.middleware');

const {
  notFoundHandler,
  errorHandler,
} = require('./middleware/error.middleware');

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },
  })
);

app.use(
  cors({
    origin:
      process.env.CLIENT_ORIGIN ||
      'http://localhost:3000',
    credentials: true,
  })
);

app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

/* IMPORTANT: serve uploaded images */
app.use(
  '/uploads',
  express.static(
    path.join(__dirname, 'uploads')
  )
);

app.use(
  morgan(
    process.env.NODE_ENV === 'production'
      ? 'combined'
      : 'dev'
  )
);

app.use('/api', apiLimiter);

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec)
);

app.use('/api/v1', routes);
app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;