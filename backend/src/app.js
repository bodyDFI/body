/**
 * Main Express Application
 */
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

// Load environment variables
require('dotenv').config();

// Import utilities and middleware
const logger = require('./utils/logger');
const { i18nextMiddleware } = require('./utils/i18n');
const swagger = require('./utils/swagger');
const security = require('./utils/security');
const { metricsMiddleware, metricsHandler } = require('./utils/monitor');
const errorHandler = require('./middleware/error/errorHandler');

// Import API routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const dataRoutes = require('./routes/data.routes');
const deviceRoutes = require('./routes/device.routes');
const marketplaceRoutes = require('./routes/marketplace.routes');
const rewardsRoutes = require('./routes/rewards.routes');
const privacyRoutes = require('./routes/privacy.routes');
const adminRoutes = require('./routes/admin.routes');

// Initialize Express app
const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  logger.info('MongoDB connected successfully');
}).catch(err => {
  logger.error(`MongoDB connection error: ${err.message}`);
  process.exit(1);
});

// Apply security middleware
security.basic.forEach(middleware => app.use(middleware));

// Request parsing
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Enable response compression
app.use(compression());

// Setup monitoring
app.use(metricsMiddleware);

// Logging middleware
app.use(morgan('combined', { stream: logger.stream }));

// Internationalization middleware
app.use(i18nextMiddleware);

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/rewards', rewardsRoutes);
app.use('/api/privacy', privacyRoutes);
app.use('/api/admin', adminRoutes);

// Swagger documentation
app.use('/api-docs', swagger.serve, swagger.setup);

// Metrics endpoint
app.get('/metrics', metricsHandler);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// 404 handler
app.use((req, res, next) => {
  const error = new Error('Route not found');
  error.statusCode = 404;
  next(error);
});

// Global error handler
app.use(errorHandler);

module.exports = app; 