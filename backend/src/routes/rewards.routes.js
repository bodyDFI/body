/**
 * Rewards API Routes
 * Handles token rewards and transactions
 */
const express = require('express');
const router = express.Router();
const rewardsController = require('../controllers/rewards.controller');
const auth = require('../middleware/auth/authMiddleware');
const validate = require('../middleware/validation/validate');
const rewardsSchema = require('../middleware/validation/schemas/rewards.schema');

/**
 * @route GET /api/rewards/balance
 * @desc Get user token balance
 * @access Private
 */
router.get(
  '/balance', 
  auth.authenticate, 
  rewardsController.getUserBalance
);

/**
 * @route GET /api/rewards/history
 * @desc Get user reward history
 * @access Private
 */
router.get(
  '/history', 
  auth.authenticate, 
  validate(rewardsSchema.getHistorySchema),
  rewardsController.getUserRewardHistory
);

/**
 * @route GET /api/rewards/transactions
 * @desc Get user transaction history
 * @access Private
 */
router.get(
  '/transactions', 
  auth.authenticate, 
  validate(rewardsSchema.getTransactionsSchema),
  rewardsController.getUserTransactionHistory
);

/**
 * @route POST /api/rewards/process
 * @desc Process a reward for user activity
 * @access Private
 */
router.post(
  '/process',
  auth.authenticate,
  validate(rewardsSchema.processRewardSchema),
  rewardsController.processReward
);

/**
 * @route POST /api/rewards/transfer
 * @desc Transfer tokens to another user
 * @access Private
 */
router.post(
  '/transfer',
  auth.authenticate,
  validate(rewardsSchema.transferTokensSchema),
  rewardsController.transferTokens
);

/**
 * @route GET /api/rewards/rules
 * @desc Get active reward rules
 * @access Private
 */
router.get(
  '/rules', 
  auth.authenticate, 
  rewardsController.getActiveRewardRules
);

/**
 * @route POST /api/rewards/rules
 * @desc Create new reward rule
 * @access Admin
 */
router.post(
  '/rules',
  auth.authenticate,
  auth.authorize(['admin']),
  validate(rewardsSchema.createRewardRuleSchema),
  rewardsController.createRewardRule
);

/**
 * @route PUT /api/rewards/rules/:ruleId
 * @desc Update existing reward rule
 * @access Admin
 */
router.put(
  '/rules/:ruleId',
  auth.authenticate,
  auth.authorize(['admin']),
  validate(rewardsSchema.updateRewardRuleSchema),
  rewardsController.updateRewardRule
);

/**
 * @route POST /api/rewards/manual
 * @desc Manually issue rewards to users
 * @access Admin
 */
router.post(
  '/manual',
  auth.authenticate,
  auth.authorize(['admin']),
  validate(rewardsSchema.manualRewardSchema),
  rewardsController.manualReward
);

module.exports = router; 