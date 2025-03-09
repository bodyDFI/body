const analyticsService = require('../services/analytics.service');

/**
 * 数据分析控制器 - 处理数据分析请求
 */
class AnalyticsController {
  /**
   * 获取用户活动概要
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getUserActivitySummary(req, res) {
    try {
      const userId = req.user.id;
      const timeframe = {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };
      
      const summary = await analyticsService.getUserActivitySummary(userId, timeframe);
      
      res.status(200).json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('获取用户活动概要错误:', error);
      res.status(500).json({
        success: false,
        message: '获取用户活动概要失败',
        error: error.message
      });
    }
  }
  
  /**
   * 获取用户健康趋势
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getUserHealthTrend(req, res) {
    try {
      const userId = req.user.id;
      const { metricType } = req.params;
      const timeframe = {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };
      
      if (!metricType) {
        return res.status(400).json({
          success: false,
          message: '必须指定指标类型'
        });
      }
      
      const validMetrics = ['heartRate', 'steps', 'sleep', 'calories'];
      if (!validMetrics.includes(metricType)) {
        return res.status(400).json({
          success: false,
          message: `不支持的指标类型: ${metricType}. 支持的类型: ${validMetrics.join(', ')}`
        });
      }
      
      const trendData = await analyticsService.getUserHealthTrend(userId, metricType, timeframe);
      
      res.status(200).json({
        success: true,
        data: trendData
      });
    } catch (error) {
      console.error('获取用户健康趋势错误:', error);
      res.status(500).json({
        success: false,
        message: '获取健康趋势数据失败',
        error: error.message
      });
    }
  }
  
  /**
   * 获取平台统计数据
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getPlatformStatistics(req, res) {
    try {
      // 检查是否为管理员
      if (!req.user.isAdmin) {
        return res.status(403).json({
          success: false,
          message: '没有权限访问平台统计数据'
        });
      }
      
      const statistics = await analyticsService.getPlatformStatistics();
      
      res.status(200).json({
        success: true,
        data: statistics
      });
    } catch (error) {
      console.error('获取平台统计数据错误:', error);
      res.status(500).json({
        success: false,
        message: '获取平台统计数据失败',
        error: error.message
      });
    }
  }
  
  /**
   * 获取设备使用统计
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getDeviceUsageAnalytics(req, res) {
    try {
      const userId = req.user.id;
      const { deviceId } = req.params;
      const timeframe = {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };
      
      const usageData = await analyticsService.getDeviceUsageAnalytics(userId, deviceId, timeframe);
      
      res.status(200).json({
        success: true,
        data: usageData
      });
    } catch (error) {
      console.error('获取设备使用统计错误:', error);
      
      if (error.message === '设备不存在或不属于该用户') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: '获取设备使用统计失败',
        error: error.message
      });
    }
  }
  
  /**
   * 获取用户的市场活动分析
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getUserMarketActivity(req, res) {
    try {
      const userId = req.user.id;
      const timeframe = {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };
      
      const activityData = await analyticsService.getUserMarketActivity(userId, timeframe);
      
      res.status(200).json({
        success: true,
        data: activityData
      });
    } catch (error) {
      console.error('获取用户市场活动错误:', error);
      res.status(500).json({
        success: false,
        message: '获取市场活动分析失败',
        error: error.message
      });
    }
  }
}

module.exports = new AnalyticsController(); 