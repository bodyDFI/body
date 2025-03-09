/**
 * Server Entry Point
 * Starts the Express application and handles server lifecycle
 */
const http = require('http');
const app = require('./app');
const logger = require('./utils/logger');

// Normalize port value
const normalizePort = (val) => {
  const port = parseInt(val, 10);
  
  if (isNaN(port)) {
    return val; // Named pipe
  }
  
  if (port >= 0) {
    return port;
  }
  
  return false;
};

// Get port from environment or default to 3000
const port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

// Create HTTP server
const server = http.createServer(app);

// Handle server errors
const onError = (error) => {
  if (error.syscall !== 'listen') {
    throw error;
  }
  
  const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`;
  
  // Handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      logger.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error(`${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
};

// Handle server listening event
const onListening = () => {
  const addr = server.address();
  const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr.port}`;
  logger.info(`Server listening on ${bind}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  logger.info(`API Documentation: http://localhost:${port}/api-docs`);
};

// Start server
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received. Closing server gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received. Closing server gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

module.exports = server; 