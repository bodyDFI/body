import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import axios from 'axios';
import { API_URL } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { colors, shadows, spacing } from '../constants';

const { width } = Dimensions.get('window');
const chartWidth = width - 32;

// 健康数据卡片组件
const MetricCard = ({ title, value, unit, icon, color, onPress }) => (
  <TouchableOpacity style={styles.metricCard} onPress={onPress}>
    <View style={styles.metricIcon}>
      <FontAwesome5 name={icon} size={24} color={color} />
    </View>
    <Text style={styles.metricTitle}>{title}</Text>
    <View style={styles.metricValueContainer}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricUnit}>{unit}</Text>
    </View>
  </TouchableOpacity>
);

// 周期选择器组件
const PeriodSelector = ({ activePeriod, onChange }) => {
  const periods = [
    { value: '7d', label: '7天' },
    { value: '30d', label: '30天' },
    { value: '90d', label: '90天' },
    { value: 'all', label: '全部' }
  ];

  return (
    <View style={styles.periodSelector}>
      {periods.map(period => (
        <TouchableOpacity
          key={period.value}
          style={[
            styles.periodButton,
            activePeriod === period.value && styles.activePeriodButton
          ]}
          onPress={() => onChange(period.value)}
        >
          <Text
            style={[
              styles.periodButtonText,
              activePeriod === period.value && styles.activePeriodButtonText
            ]}
          >
            {period.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// 折线图组件
const MetricLineChart = ({ data, title, color, loading, error, xLabel, yLabel }) => {
  if (loading) {
    return (
      <View style={styles.chartLoading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.chartError}>
        <Ionicons name="alert-circle-outline" size={24} color={colors.error} />
        <Text style={styles.chartErrorText}>{error}</Text>
      </View>
    );
  }

  if (!data || data.length === 0) {
    return (
      <View style={styles.chartError}>
        <MaterialCommunityIcons name="chart-line" size={24} color={colors.textSecondary} />
        <Text style={styles.chartErrorText}>暂无数据</Text>
      </View>
    );
  }

  const chartData = {
    labels: data.map(d => d.label),
    datasets: [
      {
        data: data.map(d => d.value),
        color: () => color || colors.primary,
        strokeWidth: 2
      }
    ],
    legend: [title]
  };

  const chartConfig = {
    backgroundGradientFrom: colors.white,
    backgroundGradientTo: colors.white,
    decimalPlaces: 0,
    color: (opacity = 1) => color || colors.primary,
    labelColor: () => colors.textSecondary,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: color || colors.primary
    }
  };

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      <LineChart
        data={chartData}
        width={chartWidth}
        height={220}
        chartConfig={chartConfig}
        bezier
        style={styles.chart}
        yAxisLabel={yLabel || ''}
        xAxisLabel={xLabel || ''}
      />
    </View>
  );
};

// 柱状图组件
const MetricBarChart = ({ data, title, color, loading, error }) => {
  if (loading) {
    return (
      <View style={styles.chartLoading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.chartError}>
        <Ionicons name="alert-circle-outline" size={24} color={colors.error} />
        <Text style={styles.chartErrorText}>{error}</Text>
      </View>
    );
  }

  if (!data || data.length === 0) {
    return (
      <View style={styles.chartError}>
        <MaterialCommunityIcons name="chart-bar" size={24} color={colors.textSecondary} />
        <Text style={styles.chartErrorText}>暂无数据</Text>
      </View>
    );
  }

  const chartData = {
    labels: data.map(d => d.label),
    datasets: [
      {
        data: data.map(d => d.value),
        color: () => color || colors.primary,
        strokeWidth: 2
      }
    ],
    legend: [title]
  };

  const chartConfig = {
    backgroundGradientFrom: colors.white,
    backgroundGradientTo: colors.white,
    decimalPlaces: 0,
    color: (opacity = 1) => color || colors.primary,
    labelColor: () => colors.textSecondary,
    style: {
      borderRadius: 16
    }
  };

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      <BarChart
        data={chartData}
        width={chartWidth}
        height={220}
        chartConfig={chartConfig}
        style={styles.chart}
        verticalLabelRotation={30}
      />
    </View>
  );
};

// 饼图组件
const MetricPieChart = ({ data, title, loading, error }) => {
  if (loading) {
    return (
      <View style={styles.chartLoading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.chartError}>
        <Ionicons name="alert-circle-outline" size={24} color={colors.error} />
        <Text style={styles.chartErrorText}>{error}</Text>
      </View>
    );
  }

  if (!data || data.length === 0) {
    return (
      <View style={styles.chartError}>
        <MaterialCommunityIcons name="chart-pie" size={24} color={colors.textSecondary} />
        <Text style={styles.chartErrorText}>暂无数据</Text>
      </View>
    );
  }

  const chartConfig = {
    backgroundGradientFrom: colors.white,
    backgroundGradientTo: colors.white,
    color: (opacity = 1) => colors.primary,
    labelColor: () => colors.textSecondary,
    style: {
      borderRadius: 16
    }
  };

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      <PieChart
        data={data}
        width={chartWidth}
        height={220}
        chartConfig={chartConfig}
        accessor="value"
        backgroundColor="transparent"
        paddingLeft="15"
        absolute
      />
    </View>
  );
};

// 主组件
const DataDashboardScreen = ({ navigation }) => {
  const { user, authToken } = useAuth();
  const [activePeriod, setActivePeriod] = useState('7d');
  const [refreshing, setRefreshing] = useState(false);
  const [activitySummary, setActivitySummary] = useState(null);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState(null);
  
  const [heartRateData, setHeartRateData] = useState(null);
  const [heartRateLoading, setHeartRateLoading] = useState(true);
  const [heartRateError, setHeartRateError] = useState(null);
  
  const [stepsData, setStepsData] = useState(null);
  const [stepsLoading, setStepsLoading] = useState(true);
  const [stepsError, setStepsError] = useState(null);
  
  const [sleepData, setSleepData] = useState(null);
  const [sleepLoading, setSleepLoading] = useState(true);
  const [sleepError, setSleepError] = useState(null);
  
  const [caloriesData, setCaloriesData] = useState(null);
  const [caloriesLoading, setCaloriesLoading] = useState(true);
  const [caloriesError, setCaloriesError] = useState(null);
  
  // 计算时间范围
  const getTimeframeFromPeriod = useCallback((period) => {
    const endDate = new Date();
    let startDate;
    
    switch (period) {
      case '7d':
        startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - 90);
        break;
      case 'all':
        startDate = new Date(0); // 从很久以前开始
        break;
      default:
        startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - 7);
    }
    
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };
  }, []);
  
  // 获取用户活动概要
  const fetchActivitySummary = useCallback(async () => {
    if (!user || !authToken) return;
    
    try {
      setActivityLoading(true);
      setActivityError(null);
      
      const timeframe = getTimeframeFromPeriod(activePeriod);
      const response = await axios.get(
        `${API_URL}/analytics/user/activity?startDate=${timeframe.startDate}&endDate=${timeframe.endDate}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      );
      
      setActivitySummary(response.data.data);
    } catch (error) {
      console.error('获取活动概要错误:', error);
      setActivityError('无法加载活动概要');
    } finally {
      setActivityLoading(false);
    }
  }, [user, authToken, activePeriod, getTimeframeFromPeriod]);
  
  // 获取心率数据
  const fetchHeartRateData = useCallback(async () => {
    if (!user || !authToken) return;
    
    try {
      setHeartRateLoading(true);
      setHeartRateError(null);
      
      const timeframe = getTimeframeFromPeriod(activePeriod);
      const response = await axios.get(
        `${API_URL}/analytics/user/health/heartRate?startDate=${timeframe.startDate}&endDate=${timeframe.endDate}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      );
      
      // 处理数据，提取每日平均值
      const dailyData = response.data.data.dailyTrend;
      setHeartRateData(dailyData.map(day => ({
        label: day.date.substring(5), // 只保留月-日
        value: day.average
      })));
    } catch (error) {
      console.error('获取心率数据错误:', error);
      setHeartRateError('无法加载心率数据');
    } finally {
      setHeartRateLoading(false);
    }
  }, [user, authToken, activePeriod, getTimeframeFromPeriod]);
  
  // 获取步数数据
  const fetchStepsData = useCallback(async () => {
    if (!user || !authToken) return;
    
    try {
      setStepsLoading(true);
      setStepsError(null);
      
      const timeframe = getTimeframeFromPeriod(activePeriod);
      const response = await axios.get(
        `${API_URL}/analytics/user/health/steps?startDate=${timeframe.startDate}&endDate=${timeframe.endDate}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      );
      
      // 处理数据，提取每日总数
      const dailyData = response.data.data.dailyTrend;
      setStepsData(dailyData.map(day => ({
        label: day.date.substring(5), // 只保留月-日
        value: day.average * day.count // 平均值乘以数量得到总数
      })));
    } catch (error) {
      console.error('获取步数数据错误:', error);
      setStepsError('无法加载步数数据');
    } finally {
      setStepsLoading(false);
    }
  }, [user, authToken, activePeriod, getTimeframeFromPeriod]);
  
  // 获取睡眠数据
  const fetchSleepData = useCallback(async () => {
    if (!user || !authToken) return;
    
    try {
      setSleepLoading(true);
      setSleepError(null);
      
      const timeframe = getTimeframeFromPeriod(activePeriod);
      const response = await axios.get(
        `${API_URL}/analytics/user/health/sleep?startDate=${timeframe.startDate}&endDate=${timeframe.endDate}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      );
      
      // 处理数据，提取每日平均值
      const dailyData = response.data.data.dailyTrend;
      setSleepData(dailyData.map(day => ({
        label: day.date.substring(5), // 只保留月-日
        value: day.average
      })));
    } catch (error) {
      console.error('获取睡眠数据错误:', error);
      setSleepError('无法加载睡眠数据');
    } finally {
      setSleepLoading(false);
    }
  }, [user, authToken, activePeriod, getTimeframeFromPeriod]);
  
  // 获取卡路里数据
  const fetchCaloriesData = useCallback(async () => {
    if (!user || !authToken) return;
    
    try {
      setCaloriesLoading(true);
      setCaloriesError(null);
      
      const timeframe = getTimeframeFromPeriod(activePeriod);
      const response = await axios.get(
        `${API_URL}/analytics/user/health/calories?startDate=${timeframe.startDate}&endDate=${timeframe.endDate}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      );
      
      // 处理数据，提取每日总数
      const dailyData = response.data.data.dailyTrend;
      setCaloriesData(dailyData.map(day => ({
        label: day.date.substring(5), // 只保留月-日
        value: day.average * day.count // 平均值乘以数量得到总数
      })));
    } catch (error) {
      console.error('获取卡路里数据错误:', error);
      setCaloriesError('无法加载卡路里数据');
    } finally {
      setCaloriesLoading(false);
    }
  }, [user, authToken, activePeriod, getTimeframeFromPeriod]);
  
  // 获取所有数据
  const fetchAllData = useCallback(() => {
    fetchActivitySummary();
    fetchHeartRateData();
    fetchStepsData();
    fetchSleepData();
    fetchCaloriesData();
  }, [fetchActivitySummary, fetchHeartRateData, fetchStepsData, fetchSleepData, fetchCaloriesData]);
  
  // 当周期更改时获取新数据
  useEffect(() => {
    fetchAllData();
  }, [activePeriod, fetchAllData]);
  
  // 当页面获得焦点时刷新数据
  useFocusEffect(
    useCallback(() => {
      fetchAllData();
    }, [fetchAllData])
  );
  
  // 处理下拉刷新
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAllData().then(() => setRefreshing(false));
  }, [fetchAllData]);
  
  // 处理查看详细健康数据
  const handleViewHealthDetail = useCallback((metricType) => {
    navigation.navigate('HealthDetail', { metricType });
  }, [navigation]);
  
  // 准备数据类型饼图数据
  const getDataTypeChartData = useCallback(() => {
    if (!activitySummary || !activitySummary.dataCollection.byType) {
      return [];
    }
    
    const types = activitySummary.dataCollection.byType;
    const colors = [colors.primary, colors.success, colors.warning, colors.accent, colors.info];
    
    return Object.entries(types).map(([type, count], index) => ({
      name: type,
      value: count,
      color: colors[index % colors.length],
      legendFontColor: colors.textPrimary,
      legendFontSize: 12
    }));
  }, [activitySummary]);
  
  // 准备设备使用饼图数据
  const getDeviceUsageChartData = useCallback(() => {
    if (!activitySummary || !activitySummary.devices.stats) {
      return [];
    }
    
    const devices = activitySummary.devices.stats;
    const colors = [colors.primary, colors.success, colors.warning, colors.accent, colors.info];
    
    return devices.map((device, index) => ({
      name: device.name || `设备 ${index + 1}`,
      value: device.dataCount,
      color: colors[index % colors.length],
      legendFontColor: colors.textPrimary,
      legendFontSize: 12
    }));
  }, [activitySummary]);
  
  // 获取最近健康数据的摘要
  const getLatestMetrics = useCallback(() => {
    return {
      heartRate: heartRateData && heartRateData.length > 0 
        ? Math.round(heartRateData[heartRateData.length - 1].value) 
        : '--',
      steps: stepsData && stepsData.length > 0 
        ? Math.round(stepsData[stepsData.length - 1].value) 
        : '--',
      sleep: sleepData && sleepData.length > 0 
        ? (sleepData[sleepData.length - 1].value / 60).toFixed(1) 
        : '--',
      calories: caloriesData && caloriesData.length > 0 
        ? Math.round(caloriesData[caloriesData.length - 1].value) 
        : '--'
    };
  }, [heartRateData, stepsData, sleepData, caloriesData]);
  
  const latestMetrics = getLatestMetrics();
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>数据仪表盘</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('DeviceScreen')}
          >
            <Ionicons name="hardware-chip-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('ProfileSettings')}
          >
            <Ionicons name="settings-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
      >
        {/* 周期选择器 */}
        <PeriodSelector
          activePeriod={activePeriod}
          onChange={setActivePeriod}
        />
        
        {/* 健康数据卡片 */}
        <View style={styles.metricsContainer}>
          <MetricCard
            title="心率"
            value={latestMetrics.heartRate}
            unit="bpm"
            icon="heartbeat"
            color={colors.error}
            onPress={() => handleViewHealthDetail('heartRate')}
          />
          <MetricCard
            title="步数"
            value={latestMetrics.steps}
            unit="步"
            icon="walking"
            color={colors.primary}
            onPress={() => handleViewHealthDetail('steps')}
          />
          <MetricCard
            title="睡眠"
            value={latestMetrics.sleep}
            unit="小时"
            icon="bed"
            color={colors.info}
            onPress={() => handleViewHealthDetail('sleep')}
          />
          <MetricCard
            title="卡路里"
            value={latestMetrics.calories}
            unit="kcal"
            icon="fire"
            color={colors.warning}
            onPress={() => handleViewHealthDetail('calories')}
          />
        </View>
        
        {/* 活动概要 */}
        {activityLoading ? (
          <View style={styles.summaryLoading}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>加载活动概要...</Text>
          </View>
        ) : activityError ? (
          <View style={styles.summaryError}>
            <Ionicons name="alert-circle-outline" size={40} color={colors.error} />
            <Text style={styles.errorText}>{activityError}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchActivitySummary}>
              <Text style={styles.retryButtonText}>重试</Text>
            </TouchableOpacity>
          </View>
        ) : activitySummary ? (
          <View style={styles.activitySummary}>
            <Text style={styles.sectionTitle}>活动概要</Text>
            <View style={styles.summaryStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{activitySummary.dataCollection.totalDataPoints}</Text>
                <Text style={styles.statLabel}>数据点</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{activitySummary.devices.total}</Text>
                <Text style={styles.statLabel}>设备</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{activitySummary.marketplace.listedData || 0}</Text>
                <Text style={styles.statLabel}>已发布数据</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{activitySummary.marketplace.purchasedData || 0}</Text>
                <Text style={styles.statLabel}>已购买数据</Text>
              </View>
            </View>
            
            {/* 数据类型分布 */}
            <MetricPieChart
              data={getDataTypeChartData()}
              title="数据类型分布"
              loading={false}
              error={null}
            />
            
            {/* 设备使用分布 */}
            <MetricPieChart
              data={getDeviceUsageChartData()}
              title="设备使用分布"
              loading={false}
              error={null}
            />
          </View>
        ) : null}
        
        {/* 心率图表 */}
        <MetricLineChart
          data={heartRateData}
          title="心率趋势"
          color={colors.error}
          loading={heartRateLoading}
          error={heartRateError}
          yLabel="bpm"
        />
        
        {/* 步数图表 */}
        <MetricBarChart
          data={stepsData}
          title="每日步数"
          color={colors.primary}
          loading={stepsLoading}
          error={stepsError}
        />
        
        {/* 睡眠图表 */}
        <MetricLineChart
          data={sleepData}
          title="睡眠时长 (分钟)"
          color={colors.info}
          loading={sleepLoading}
          error={sleepError}
          yLabel="分钟"
        />
        
        {/* 卡路里图表 */}
        <MetricBarChart
          data={caloriesData}
          title="每日消耗卡路里"
          color={colors.warning}
          loading={caloriesLoading}
          error={caloriesError}
        />
        
        {/* 底部空间 */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    ...shadows.small,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
  },
  headerButton: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
  periodSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.white,
    marginTop: spacing.xs,
    ...shadows.small,
  },
  periodButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 16,
    backgroundColor: colors.lightGray,
  },
  activePeriodButton: {
    backgroundColor: colors.primary,
  },
  periodButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  activePeriodButtonText: {
    color: colors.white,
    fontWeight: '500',
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: spacing.sm,
    backgroundColor: colors.white,
    marginTop: spacing.xs,
    ...shadows.small,
  },
  metricCard: {
    width: '48%',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: spacing.sm,
    alignItems: 'center',
    ...shadows.medium,
  },
  metricIcon: {
    marginBottom: spacing.xs,
  },
  metricTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  metricValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  metricUnit: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  activitySummary: {
    padding: spacing.md,
    backgroundColor: colors.white,
    marginTop: spacing.xs,
    ...shadows.small,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  chartContainer: {
    padding: spacing.md,
    backgroundColor: colors.white,
    marginTop: spacing.xs,
    ...shadows.small,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartLoading: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartError: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartErrorText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  summaryLoading: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    marginTop: spacing.xs,
    alignItems: 'center',
    ...shadows.small,
  },
  summaryError: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    marginTop: spacing.xs,
    alignItems: 'center',
    ...shadows.small,
  },
  loadingText: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
  },
  errorText: {
    marginTop: spacing.sm,
    color: colors.error,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontWeight: '500',
  },
  bottomSpacer: {
    height: 80,
  },
});

export default DataDashboardScreen; 