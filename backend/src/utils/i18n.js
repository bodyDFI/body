/**
 * Internationalization (i18n) utility
 * Configures and provides internationalization support for the application
 */
const path = require('path');
const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const middleware = require('i18next-http-middleware');

// Initialize i18next with server-side configuration
i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    // Path to locales
    backend: {
      loadPath: path.join(__dirname, '../locales/{{lng}}/{{ns}}.json'),
      addPath: path.join(__dirname, '../locales/{{lng}}/{{ns}}.missing.json')
    },
    // Allowed languages
    supportedLngs: ['en', 'zh'],
    // Default language
    fallbackLng: 'en',
    // Default namespace
    defaultNS: 'common',
    // Debug mode in development
    debug: process.env.NODE_ENV === 'development',
    // Allow keys not found in English
    saveMissing: process.env.NODE_ENV === 'development',
    // Detect language preference
    detection: {
      // Order of detection methods
      order: ['header', 'cookie', 'querystring'],
      // Language parameter in query string
      lookupQuerystring: 'lng',
      // Language cookie name
      lookupCookie: 'i18next',
      // Cache language selection in cookies
      caches: ['cookie']
    },
    // Interpolation options
    interpolation: {
      escapeValue: false // Not needed for server-side
    }
  });

// Middleware to handle i18n in Express
const i18nextMiddleware = middleware.handle(i18next);

// Helper function to get translations in backend code
const t = (key, options, lng = 'en') => {
  return i18next.t(key, { lng, ...options });
};

module.exports = {
  i18next,
  i18nextMiddleware,
  t
}; 