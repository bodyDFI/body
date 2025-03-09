import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// Import translation files
import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enDashboard from './locales/en/dashboard.json';
import enMarketplace from './locales/en/marketplace.json';
import enDevice from './locales/en/device.json';
import enProfile from './locales/en/profile.json';
import enErrors from './locales/en/errors.json';

import zhCommon from './locales/zh/common.json';
import zhAuth from './locales/zh/auth.json';
import zhDashboard from './locales/zh/dashboard.json';
import zhMarketplace from './locales/zh/marketplace.json';
import zhDevice from './locales/zh/device.json';
import zhProfile from './locales/zh/profile.json';
import zhErrors from './locales/zh/errors.json';

// Resources with translations
const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    dashboard: enDashboard,
    marketplace: enMarketplace,
    device: enDevice,
    profile: enProfile,
    errors: enErrors
  },
  zh: {
    common: zhCommon,
    auth: zhAuth,
    dashboard: zhDashboard,
    marketplace: zhMarketplace,
    device: zhDevice,
    profile: zhProfile,
    errors: zhErrors
  }
};

i18n
  // Load translations using http for lazy loading
  .use(Backend)
  // Detect user language
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    resources,
    // Default language
    fallbackLng: 'en',
    // Debug mode in development
    debug: process.env.NODE_ENV === 'development',
    // List of namespaces
    ns: ['common', 'auth', 'dashboard', 'marketplace', 'device', 'profile', 'errors'],
    defaultNS: 'common',
    // Cache settings
    cache: {
      enabled: true,
      expirationTime: 7 * 24 * 60 * 60 * 1000 // 7 days
    },
    // Detection options
    detection: {
      order: ['querystring', 'cookie', 'localStorage', 'navigator'],
      lookupQuerystring: 'lng',
      lookupCookie: 'i18next',
      lookupLocalStorage: 'i18nextLng',
      // Cache user language selection
      caches: ['localStorage', 'cookie']
    },
    // Interpolation options
    interpolation: {
      escapeValue: false // React already safes from XSS
    },
    react: {
      useSuspense: true
    }
  });

// Function to change the language
export const changeLanguage = (language) => {
  i18n.changeLanguage(language);
};

// Export the i18n instance
export default i18n; 