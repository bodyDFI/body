const express = require('express');
const analyticsController = require('../controllers/analytics.controller');
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');

const router = express.Router();

// 所有路由需要认证
router.use(authMiddleware);

// 获取用户活动概要
router.get('/user/activity', analyticsController.getUserActivitySummary);

// 获取用户健康趋势
router.get('/user/health/:metricType', analyticsController.getUserHealthTrend);

// 获取设备使用统计
router.get('/devices/usage', analyticsController.getDeviceUsageAnalytics);
router.get('/devices/usage/:deviceId', analyticsController.getDeviceUsageAnalytics);

// 获取用户市场活动
router.get('/user/market', analyticsController.getUserMarketActivity);

// 管理员权限路由
router.get('/platform', adminMiddleware, analyticsController.getPlatformStatistics);

module.exports = router; 