/**
 * Privacy API Routes
 * Handles user privacy settings and data access controls
 */
const express = require('express');
const router = express.Router();
const privacyController = require('../controllers/privacy.controller');
const auth = require('../middleware/auth/authMiddleware');
const validate = require('../middleware/validation/validate');
const privacySchema = require('../middleware/validation/schemas/privacy.schema');

/**
 * @route GET /api/privacy/settings
 * @desc Get user privacy settings
 * @access Private
 */
router.get(
  '/settings', 
  auth.authenticate, 
  privacyController.getUserPrivacySettings
);

/**
 * @route PUT /api/privacy/settings
 * @desc Update user privacy settings
 * @access Private
 */
router.put(
  '/settings',
  auth.authenticate,
  validate(privacySchema.updatePrivacySettingsSchema),
  privacyController.updatePrivacySettings
);

/**
 * @route GET /api/privacy/access-logs
 * @desc Get user data access logs
 * @access Private
 */
router.get(
  '/access-logs',
  auth.authenticate,
  validate(privacySchema.getAccessLogsSchema),
  privacyController.getUserAccessLogs
);

/**
 * @route POST /api/privacy/deletion-request
 * @desc Submit a data deletion request
 * @access Private
 */
router.post(
  '/deletion-request',
  auth.authenticate,
  validate(privacySchema.deletionRequestSchema),
  privacyController.submitDeletionRequest
);

/**
 * @route POST /api/privacy/encryption-key
 * @desc Set user encryption key
 * @access Private
 */
router.post(
  '/encryption-key',
  auth.authenticate,
  validate(privacySchema.setEncryptionKeySchema),
  privacyController.setEncryptionKey
);

/**
 * @route GET /api/privacy/encryption-key
 * @desc Get encryption key info (not the key itself)
 * @access Private
 */
router.get(
  '/encryption-key',
  auth.authenticate,
  privacyController.getEncryptionKeyInfo
);

/**
 * @route POST /api/privacy/device-authorization
 * @desc Authorize a device to access user data
 * @access Private
 */
router.post(
  '/device-authorization',
  auth.authenticate,
  validate(privacySchema.deviceAuthorizationSchema),
  privacyController.authorizeDevice
);

/**
 * @route DELETE /api/privacy/device-authorization/:deviceId
 * @desc Revoke device authorization
 * @access Private
 */
router.delete(
  '/device-authorization/:deviceId',
  auth.authenticate,
  validate(privacySchema.deviceIdParamSchema),
  privacyController.revokeDeviceAuthorization
);

/**
 * @route GET /api/privacy/device-authorization/:deviceId
 * @desc Check if device is authorized
 * @access Private
 */
router.get(
  '/device-authorization/:deviceId',
  auth.authenticate,
  validate(privacySchema.deviceIdParamSchema),
  privacyController.checkDeviceAuthorization
);

module.exports = router; 