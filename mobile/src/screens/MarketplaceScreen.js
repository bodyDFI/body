import React, { useState, useEffect, useCallback } from 'react';
import {
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  RefreshControl,
  TextInput
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { colors, shadows, spacing } from '../constants';

// 数据类型标签组件
const DataTypeTag = ({ type }) => {
  const getTagStyle = () => {
    switch (type) {
      case 'motion':
        return { backgroundColor: colors.primary };
      case 'biometric':
        return { backgroundColor: colors.accent };
      case 'position':
        return { backgroundColor: colors.success };
      case 'training':
        return { backgroundColor: colors.warning };
      default:
        return { backgroundColor: colors.gray };
    }
  };

  return (
    <View style={[styles.tag, getTagStyle()]}>
      <Text style={styles.tagText}>{type}</Text>
    </View>
  );
};

// 数据列表项组件
const ListingItem = ({ item, onPress }) => {
  return (
    <TouchableOpacity style={styles.listingItem} onPress={() => onPress(item)}>
      <View style={styles.listingHeader}>
        <Image
          source={item.previewImageUrl ? { uri: item.previewImageUrl } : require('../../assets/data-placeholder.png')}
          style={styles.listingImage}
        />
        <View style={styles.listingInfo}>
          <Text style={styles.listingTitle} numberOfLines={1}>{item.title}</Text>
          <View style={styles.providerContainer}>
            <MaterialCommunityIcons name="account" size={16} color={colors.textSecondary} />
            <Text style={styles.providerText}>{item.provider.username}</Text>
          </View>
          <View style={styles.tagsContainer}>
            <DataTypeTag type={item.dataType} />
            {item.featured && (
              <View style={styles.featuredTag}>
                <Text style={styles.featuredTagText}>精选</Text>
              </View>
            )}
          </View>
        </View>
      </View>
      <View style={styles.listingDetails}>
        <Text style={styles.listingDescription} numberOfLines={2}>{item.description}</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="clock-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.statText}>{item.accessPeriod} 天</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="shopping-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.statText}>{item.purchaseCount || 0} 购买</Text>
          </View>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color={colors.warning} />
            <Text style={styles.ratingText}>
              {item.rating?.averageScore?.toFixed(1) || '暂无评分'}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.priceContainer}>
        <Text style={styles.priceLabel}>价格</Text>
        <Text style={styles.priceValue}>{item.price} BDF</Text>
      </View>
    </TouchableOpacity>
  );
};

// 空列表组件
const EmptyListComponent = ({ isFiltering }) => (
  <View style={styles.emptyContainer}>
    <MaterialCommunityIcons name="database-off" size={64} color={colors.textSecondary} />
    <Text style={styles.emptyTitle}>
      {isFiltering ? '没有匹配的结果' : '暂无数据列表'}
    </Text>
    <Text style={styles.emptyDescription}>
      {isFiltering 
        ? '尝试调整过滤条件或清除搜索关键词'
        : '目前市场上没有数据列表。请稍后再来查看，或者成为第一个发布数据的用户！'
      }
    </Text>
  </View>
);

// 过滤器组件
const FilterBar = ({ activeFilters, onFilterChange, onSearchChange, searchQuery }) => {
  const dataTypes = [
    { id: 'all', label: '全部' },
    { id: 'motion', label: '运动数据' },
    { id: 'biometric', label: '生物数据' },
    { id: 'position', label: '位置数据' },
    { id: 'training', label: '训练集' }
  ];

  const sortOptions = [
    { id: 'createdAt_desc', label: '最新' },
    { id: 'price_asc', label: '价格：低到高' },
    { id: 'price_desc', label: '价格：高到低' },
    { id: 'rating_desc', label: '评分：高到低' },
    { id: 'purchaseCount_desc', label: '最热门' }
  ];

  return (
    <View style={styles.filterContainer}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="搜索数据列表..."
          value={searchQuery}
          onChangeText={onSearchChange}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => onSearchChange('')}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      
      <Text style={styles.filterLabel}>数据类型</Text>
      <FlatList
        horizontal
        data={dataTypes}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.filterChip,
              activeFilters.dataType === item.id && styles.activeFilterChip
            ]}
            onPress={() => onFilterChange('dataType', item.id === 'all' ? null : item.id)}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilters.dataType === item.id && styles.activeFilterChipText
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
        style={styles.filterList}
      />
      
      <Text style={styles.filterLabel}>排序方式</Text>
      <FlatList
        horizontal
        data={sortOptions}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => {
          const [sortBy, sortOrder] = item.id.split('_');
          const isActive = 
            activeFilters.sortBy === sortBy && 
            activeFilters.sortOrder === sortOrder;
            
          return (
            <TouchableOpacity
              style={[
                styles.filterChip,
                isActive && styles.activeFilterChip
              ]}
              onPress={() => {
                onFilterChange('sortBy', sortBy);
                onFilterChange('sortOrder', sortOrder);
              }}
            >
              <Text
                style={[
                  styles.filterChipText,
                  isActive && styles.activeFilterChipText
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        }}
        style={styles.filterList}
      />
    </View>
  );
};

// 主组件
const MarketplaceScreen = ({ navigation }) => {
  const { user, authToken } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    dataType: null,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: 1,
    limit: 20,
  });
  const [pagination, setPagination] = useState({
    totalPages: 1,
    totalItems: 0,
    hasMore: false,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // 加载数据
  const fetchListings = useCallback(async (page = 1, refresh = false) => {
    try {
      if (refresh) {
        setLoading(true);
      }
      
      const queryParams = new URLSearchParams();
      
      // 添加基本筛选参数
      if (filters.dataType) queryParams.append('dataType', filters.dataType);
      queryParams.append('sortBy', filters.sortBy);
      queryParams.append('sortOrder', filters.sortOrder);
      queryParams.append('page', page);
      queryParams.append('limit', filters.limit);
      
      // 添加搜索参数
      if (searchQuery) queryParams.append('search', searchQuery);

      const response = await axios.get(
        `${API_URL}/marketplace/listings?${queryParams.toString()}`
      );
      
      const newListings = response.data.data;
      
      if (refresh || page === 1) {
        setListings(newListings);
      } else {
        setListings(prev => [...prev, ...newListings]);
      }
      
      setPagination(response.data.pagination);
      setError(null);
    } catch (err) {
      console.error('Error fetching listings:', err);
      setError('获取数据列表失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, searchQuery]);

  // 初始加载和筛选变化时重新加载
  useEffect(() => {
    fetchListings(1, true);
  }, [filters.dataType, filters.sortBy, filters.sortOrder, searchQuery]);

  // 当页面获得焦点时刷新数据
  useFocusEffect(
    useCallback(() => {
      fetchListings(1, true);
    }, [])
  );

  // 处理下拉刷新
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchListings(1, true);
  }, [fetchListings]);

  // 加载更多
  const handleLoadMore = useCallback(() => {
    if (pagination.hasMore && !loading) {
      fetchListings(pagination.currentPage + 1);
    }
  }, [pagination, loading, fetchListings]);

  // 处理点击列表项
  const handleListingPress = useCallback((listing) => {
    navigation.navigate('ListingDetail', { listingId: listing.id });
  }, [navigation]);

  // 处理筛选变化
  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // 处理搜索变化
  const handleSearchChange = useCallback((text) => {
    setSearchQuery(text);
  }, []);

  // 添加新列表
  const handleAddListing = useCallback(() => {
    if (!user) {
      navigation.navigate('Auth');
      return;
    }
    navigation.navigate('CreateListing');
  }, [navigation, user]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>数据市场</Text>
        <TouchableOpacity 
          style={styles.headerButton} 
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons name="options" size={24} color={colors.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.headerButton} onPress={handleAddListing}>
          <Ionicons name="add-circle" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>
      
      {/* 过滤器区域 */}
      {showFilters && (
        <FilterBar
          activeFilters={filters}
          onFilterChange={handleFilterChange}
          onSearchChange={handleSearchChange}
          searchQuery={searchQuery}
        />
      )}
      
      {/* 错误提示 */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => fetchListings(1, true)}
          >
            <Text style={styles.retryButtonText}>重试</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* 列表加载器 */}
      {loading && !refreshing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>加载数据列表中...</Text>
        </View>
      )}
      
      {/* 数据列表 */}
      {!loading && (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ListingItem item={item} onPress={handleListingPress} />
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyListComponent isFiltering={!!searchQuery || !!filters.dataType} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.1}
          ListFooterComponent={
            pagination.hasMore && listings.length > 0 ? (
              <ActivityIndicator style={styles.footerLoader} color={colors.primary} />
            ) : null
          }
        />
      )}
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
    ...shadows.small,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    flex: 1,
  },
  headerButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  loadingText: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: 16,
  },
  listContent: {
    padding: spacing.sm,
    paddingBottom: spacing.xl * 2,
  },
  emptyContainer: {
    padding: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptyDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  listingItem: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: spacing.md,
    padding: spacing.md,
    ...shadows.medium,
  },
  listingHeader: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  listingImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: colors.lightGray,
  },
  listingInfo: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  listingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  providerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  providerText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    marginTop: spacing.xs,
    flexWrap: 'wrap',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '500',
  },
  featuredTag: {
    backgroundColor: colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
  },
  featuredTagText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '500',
  },
  listingDetails: {
    marginTop: spacing.xs,
  },
  listingDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  statText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    marginLeft: 4,
  },
  priceContainer: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.success,
  },
  filterContainer: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  filterList: {
    marginBottom: spacing.sm,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginRight: spacing.sm,
    backgroundColor: colors.white,
  },
  activeFilterChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  activeFilterChipText: {
    color: colors.white,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.lightGray,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.xs,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: spacing.xs,
  },
  errorContainer: {
    padding: spacing.md,
    backgroundColor: colors.errorLight,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: colors.error,
    flex: 1,
  },
  retryButton: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 4,
  },
  retryButtonText: {
    color: colors.white,
    fontWeight: '500',
    fontSize: 12,
  },
  footerLoader: {
    marginVertical: spacing.md,
  },
});

export default MarketplaceScreen; 