const marketplaceService = require('../services/marketplace.service');
const { validationResult } = require('express-validator');

/**
 * 数据市场控制器 - 处理数据市场相关的API请求
 */
class MarketplaceController {
  /**
   * 获取所有数据列表
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getAllListings(req, res) {
    try {
      // 解析查询参数
      const filters = {
        dataType: req.query.dataType,
        category: req.query.category,
        provider: req.query.provider,
        priceMin: req.query.priceMin ? parseInt(req.query.priceMin) : undefined,
        priceMax: req.query.priceMax ? parseInt(req.query.priceMax) : undefined,
        featured: req.query.featured === 'true',
        search: req.query.search
      };

      // 清除未定义的过滤器
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined) {
          delete filters[key];
        }
      });

      // 解析分页和排序参数
      const options = {
        page: req.query.page ? parseInt(req.query.page) : 1,
        limit: req.query.limit ? parseInt(req.query.limit) : 20,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'desc'
      };

      // 获取列表数据
      const result = await marketplaceService.getListings(filters, options);

      res.status(200).json({
        success: true,
        data: result.listings,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('获取数据列表错误:', error);
      res.status(500).json({
        success: false,
        message: '获取数据列表失败',
        error: error.message
      });
    }
  }

  /**
   * 获取单个数据列表详情
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getListingById(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: '缺少列表ID'
        });
      }

      const listing = await marketplaceService.getListingById(id);

      res.status(200).json({
        success: true,
        data: listing
      });
    } catch (error) {
      console.error('获取数据列表详情错误:', error);
      
      if (error.message === '数据列表不存在') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: '获取数据列表详情失败',
        error: error.message
      });
    }
  }

  /**
   * 创建新的数据列表
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async createListing(req, res) {
    try {
      // 验证请求参数
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const userId = req.user.id;
      const listingData = {
        title: req.body.title,
        description: req.body.description,
        dataType: req.body.dataType,
        category: req.body.category,
        deviceSource: req.body.deviceSource,
        price: req.body.price,
        accessPeriod: req.body.accessPeriod,
        timeframe: {
          startDate: req.body.startDate,
          endDate: req.body.endDate
        },
        tags: req.body.tags,
        frequency: req.body.frequency,
        additionalInfo: req.body.additionalInfo
      };

      const newListing = await marketplaceService.createListing(listingData, userId);

      res.status(201).json({
        success: true,
        message: '数据列表创建成功',
        data: newListing
      });
    } catch (error) {
      console.error('创建数据列表错误:', error);
      res.status(500).json({
        success: false,
        message: '创建数据列表失败',
        error: error.message
      });
    }
  }

  /**
   * 更新数据列表
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async updateListing(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: '缺少列表ID'
        });
      }

      // 验证请求参数
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const updateData = {
        title: req.body.title,
        description: req.body.description,
        price: req.body.price,
        accessPeriod: req.body.accessPeriod,
        status: req.body.status,
        category: req.body.category,
        tags: req.body.tags,
        previewImageUrl: req.body.previewImageUrl
      };

      const updatedListing = await marketplaceService.updateListing(id, updateData, userId);

      res.status(200).json({
        success: true,
        message: '数据列表更新成功',
        data: updatedListing
      });
    } catch (error) {
      console.error('更新数据列表错误:', error);
      
      if (error.message === '数据列表不存在或无权限编辑') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: '更新数据列表失败',
        error: error.message
      });
    }
  }

  /**
   * 购买数据列表
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async purchaseAccess(req, res) {
    try {
      const { listingId } = req.params;
      const userId = req.user.id;

      if (!listingId) {
        return res.status(400).json({
          success: false,
          message: '缺少列表ID'
        });
      }

      const purchase = await marketplaceService.purchaseListing(listingId, userId);

      res.status(200).json({
        success: true,
        message: '数据购买成功',
        data: purchase
      });
    } catch (error) {
      console.error('购买数据列表错误:', error);
      
      if (
        error.message === '数据列表不存在或不可购买' ||
        error.message === '不能购买自己的数据列表' ||
        error.message === '已购买此数据列表'
      ) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      if (error.message.startsWith('区块链交易失败')) {
        return res.status(500).json({
          success: false,
          message: '区块链交易失败',
          error: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: '购买数据列表失败',
        error: error.message
      });
    }
  }

  /**
   * 获取用户购买记录
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getUserPurchases(req, res) {
    try {
      const userId = req.user.id;
      
      // 解析查询参数
      const filters = {
        status: req.query.status,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      // 清除未定义的过滤器
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined) {
          delete filters[key];
        }
      });

      const purchases = await marketplaceService.getUserPurchases(userId, filters);

      res.status(200).json({
        success: true,
        data: purchases
      });
    } catch (error) {
      console.error('获取用户购买记录错误:', error);
      res.status(500).json({
        success: false,
        message: '获取购买记录失败',
        error: error.message
      });
    }
  }

  /**
   * 获取用户发布的列表
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getUserListings(req, res) {
    try {
      const userId = req.user.id;
      
      // 解析查询参数
      const filters = {
        status: req.query.status,
        dataType: req.query.dataType,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      // 清除未定义的过滤器
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined) {
          delete filters[key];
        }
      });

      const listings = await marketplaceService.getUserListings(userId, filters);

      res.status(200).json({
        success: true,
        data: listings
      });
    } catch (error) {
      console.error('获取用户列表错误:', error);
      res.status(500).json({
        success: false,
        message: '获取列表记录失败',
        error: error.message
      });
    }
  }

  /**
   * 获取用户销售记录
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getUserSales(req, res) {
    try {
      const userId = req.user.id;
      
      // 解析查询参数
      const filters = {
        status: req.query.status,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      // 清除未定义的过滤器
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined) {
          delete filters[key];
        }
      });

      const sales = await marketplaceService.getUserSales(userId, filters);

      res.status(200).json({
        success: true,
        data: sales
      });
    } catch (error) {
      console.error('获取用户销售记录错误:', error);
      res.status(500).json({
        success: false,
        message: '获取销售记录失败',
        error: error.message
      });
    }
  }

  /**
   * 评价数据购买
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async ratePurchase(req, res) {
    try {
      const { purchaseId } = req.params;
      const userId = req.user.id;

      if (!purchaseId) {
        return res.status(400).json({
          success: false,
          message: '缺少购买ID'
        });
      }

      // 验证请求参数
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const ratingData = {
        score: parseInt(req.body.score),
        comment: req.body.comment
      };

      const updatedPurchase = await marketplaceService.ratePurchase(purchaseId, ratingData, userId);

      res.status(200).json({
        success: true,
        message: '评价成功',
        data: updatedPurchase
      });
    } catch (error) {
      console.error('评价购买错误:', error);
      
      if (
        error.message === '购买记录不存在或无权限评价' ||
        error.message === '只能评价有效或已过期的购买' ||
        error.message === '已评价过此购买'
      ) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: '评价失败',
        error: error.message
      });
    }
  }

  /**
   * 获取购买的数据内容
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getPurchaseData(req, res) {
    try {
      const { purchaseId } = req.params;
      const userId = req.user.id;

      if (!purchaseId) {
        return res.status(400).json({
          success: false,
          message: '缺少购买ID'
        });
      }

      const data = await marketplaceService.getPurchaseData(purchaseId, userId);

      res.status(200).json({
        success: true,
        data
      });
    } catch (error) {
      console.error('获取购买数据错误:', error);
      
      if (
        error.message === '购买记录不存在、无效或无权限访问' ||
        error.message === '访问权限已过期' ||
        error.message === '无法访问数据：数据列表信息不完整'
      ) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: '获取数据失败',
        error: error.message
      });
    }
  }

  /**
   * 获取数据类别和标签统计
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getCategoriesAndTags(req, res) {
    try {
      const stats = await marketplaceService.getCategoriesAndTags();
      
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('获取类别和标签统计错误:', error);
      res.status(500).json({
        success: false,
        message: '获取统计信息失败',
        error: error.message
      });
    }
  }

  /**
   * 获取市场统计数据
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getMarketplaceStats(req, res) {
    try {
      const stats = await marketplaceService.getMarketplaceStats();
      
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('获取市场统计错误:', error);
      res.status(500).json({
        success: false,
        message: '获取统计信息失败',
        error: error.message
      });
    }
  }

  /**
   * 管理员设置特色列表
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async setFeaturedListing(req, res) {
    try {
      const { id } = req.params;
      const { featured } = req.body;
      const adminId = req.user.id;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: '缺少列表ID'
        });
      }

      if (featured === undefined) {
        return res.status(400).json({
          success: false,
          message: '缺少featured参数'
        });
      }

      const updatedListing = await marketplaceService.setListingFeatured(id, featured, adminId);

      res.status(200).json({
        success: true,
        message: `列表${featured ? '已设为' : '已取消'}特色`,
        data: updatedListing
      });
    } catch (error) {
      console.error('设置特色列表错误:', error);
      
      if (error.message === '无权执行此操作') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }
      
      if (error.message === '数据列表不存在') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: '设置特色列表失败',
        error: error.message
      });
    }
  }
}

module.exports = new MarketplaceController(); 