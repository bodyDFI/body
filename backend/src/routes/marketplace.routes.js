const express = require('express');
const { check } = require('express-validator');
const marketplaceController = require('../controllers/marketplace.controller');
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');

const router = express.Router();

// 获取所有数据列表 (公开)
router.get('/listings', marketplaceController.getAllListings);

// 获取单个数据列表详情 (公开)
router.get('/listings/:id', marketplaceController.getListingById);

// 创建新的数据列表 (需要认证)
router.post(
  '/listings',
  [
    authMiddleware,
    check('title', '标题是必需的').notEmpty(),
    check('description', '描述是必需的').notEmpty(),
    check('dataType', '数据类型是必需的').notEmpty(),
    check('price', '价格是必需的').isNumeric(),
    check('accessPeriod', '访问期限是必需的').isNumeric(),
    check('deviceSource', '设备来源是必需的').notEmpty()
  ],
  marketplaceController.createListing
);

// 更新数据列表 (需要认证)
router.put(
  '/listings/:id',
  [
    authMiddleware,
    check('title', '标题不能为空').optional().notEmpty(),
    check('description', '描述不能为空').optional().notEmpty(),
    check('price', '价格必须是数字').optional().isNumeric(),
    check('accessPeriod', '访问期限必须是数字').optional().isNumeric(),
    check('status', '状态必须是有效值').optional().isIn(['active', 'inactive', 'pending'])
  ],
  marketplaceController.updateListing
);

// 购买数据列表 (需要认证)
router.post(
  '/purchase/:listingId',
  authMiddleware,
  marketplaceController.purchaseAccess
);

// 获取用户购买记录 (需要认证)
router.get(
  '/my-purchases',
  authMiddleware,
  marketplaceController.getUserPurchases
);

// 获取用户的列表 (需要认证)
router.get(
  '/my-listings',
  authMiddleware,
  marketplaceController.getUserListings
);

// 获取用户销售记录 (需要认证)
router.get(
  '/my-sales',
  authMiddleware,
  marketplaceController.getUserSales
);

// 评价购买 (需要认证)
router.post(
  '/rate/:purchaseId',
  [
    authMiddleware,
    check('score', '评分是必需的并且必须在1-5之间').isInt({ min: 1, max: 5 }),
    check('comment', '评论是必需的').optional().notEmpty()
  ],
  marketplaceController.ratePurchase
);

// 获取购买的数据 (需要认证)
router.get(
  '/access/:purchaseId',
  authMiddleware,
  marketplaceController.getPurchaseData
);

// 获取类别和标签统计 (公开)
router.get(
  '/categories-and-tags',
  marketplaceController.getCategoriesAndTags
);

// 获取市场统计 (公开)
router.get(
  '/stats',
  marketplaceController.getMarketplaceStats
);

// 设置特色列表 (需要管理员权限)
router.put(
  '/featured/:id',
  [
    authMiddleware,
    adminMiddleware,
    check('featured', 'featured 参数是必需的且必须为布尔值').isBoolean()
  ],
  marketplaceController.setFeaturedListing
);

module.exports = router; 