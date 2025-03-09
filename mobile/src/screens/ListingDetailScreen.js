import React, { useState, useEffect, useCallback } from 'react';
import {
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  Alert,
  Modal
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { colors, shadows, spacing } from '../constants';

const ListingDetailScreen = ({ route }) => {
  const { listingId } = route.params;
  const navigation = useNavigation();
  const { user, authToken } = useAuth();
  
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseModalVisible, setPurchaseModalVisible] = useState(false);
  
  // 获取列表详情
  const fetchListingDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`${API_URL}/marketplace/listings/${listingId}`);
      setListing(response.data.data);
    } catch (err) {
      console.error('获取列表详情错误:', err);
      setError('获取数据列表详情失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [listingId]);
  
  // 当页面获得焦点时获取数据
  useFocusEffect(
    useCallback(() => {
      fetchListingDetails();
    }, [fetchListingDetails])
  );
  
  // 处理购买
  const handlePurchase = useCallback(async () => {
    if (!user) {
      navigation.navigate('Auth');
      return;
    }
    
    try {
      setPurchaseLoading(true);
      
      const response = await axios.post(
        `${API_URL}/marketplace/purchase/${listingId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      );
      
      setPurchaseModalVisible(false);
      Alert.alert(
        '购买成功', 
        '您已成功购买此数据。您可以在"我的购买"部分查看和访问这些数据。',
        [
          { 
            text: '查看我的购买', 
            onPress: () => navigation.navigate('MyPurchases')
          },
          {
            text: '留在此页',
            style: 'cancel'
          }
        ]
      );
      
      // 刷新以更新购买后的数据
      fetchListingDetails();
    } catch (err) {
      console.error('购买错误:', err);
      setPurchaseModalVisible(false);
      
      const errorMessage = err.response?.data?.message || '购买失败，请稍后重试';
      Alert.alert('购买失败', errorMessage);
    } finally {
      setPurchaseLoading(false);
    }
  }, [listingId, user, authToken, navigation, fetchListingDetails]);
  
  // 检查是否已购买
  const checkIfAlreadyPurchased = useCallback(async () => {
    if (!user || !authToken) return false;
    
    try {
      const response = await axios.get(
        `${API_URL}/marketplace/my-purchases`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      );
      
      const purchases = response.data.data;
      return purchases.some(purchase => purchase.listing.id === listingId);
    } catch (err) {
      console.error('检查购买状态错误:', err);
      return false;
    }
  }, [listingId, user, authToken]);
  
  // 处理展示购买确认弹窗
  const handleShowPurchaseModal = useCallback(async () => {
    if (!user) {
      navigation.navigate('Auth', { 
        message: '请先登录以购买数据'
      });
      return;
    }
    
    // 检查是否已购买
    const alreadyPurchased = await checkIfAlreadyPurchased();
    if (alreadyPurchased) {
      Alert.alert(
        '已购买', 
        '您已经购买过此数据列表。请前往"我的购买"部分查看。',
        [
          { 
            text: '查看我的购买', 
            onPress: () => navigation.navigate('MyPurchases')
          },
          {
            text: '知道了',
            style: 'cancel'
          }
        ]
      );
      return;
    }
    
    setPurchaseModalVisible(true);
  }, [user, navigation, checkIfAlreadyPurchased]);
  
  // 购买确认弹窗
  const PurchaseConfirmationModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={purchaseModalVisible}
      onRequestClose={() => setPurchaseModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>确认购买</Text>
          
          <View style={styles.modalListingInfo}>
            <Image
              source={
                listing?.previewImageUrl 
                  ? { uri: listing.previewImageUrl } 
                  : require('../../assets/data-placeholder.png')
              }
              style={styles.modalImage}
            />
            <View style={styles.modalListingDetails}>
              <Text style={styles.modalListingTitle} numberOfLines={1}>
                {listing?.title}
              </Text>
              <Text style={styles.modalProviderText} numberOfLines={1}>
                提供者: {listing?.provider.username}
              </Text>
            </View>
          </View>
          
          <View style={styles.modalDivider} />
          
          <View style={styles.modalPriceContainer}>
            <Text style={styles.modalPriceLabel}>价格</Text>
            <Text style={styles.modalPriceValue}>{listing?.price} BDF</Text>
          </View>
          
          <View style={styles.modalPriceContainer}>
            <Text style={styles.modalPriceLabel}>访问期限</Text>
            <Text style={styles.modalPriceValue}>{listing?.accessPeriod} 天</Text>
          </View>
          
          <View style={styles.modalMessage}>
            <MaterialCommunityIcons name="information-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.modalMessageText}>
              购买后，您将可以访问此数据列表的所有数据点，直到访问期限结束。
            </Text>
          </View>
          
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={styles.modalCancelButton}
              onPress={() => setPurchaseModalVisible(false)}
              disabled={purchaseLoading}
            >
              <Text style={styles.modalCancelButtonText}>取消</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalConfirmButton}
              onPress={handlePurchase}
              disabled={purchaseLoading}
            >
              {purchaseLoading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.modalConfirmButtonText}>确认购买</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
  
  // 加载中状态
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>加载数据列表详情...</Text>
      </View>
    );
  }
  
  // 错误状态
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle-outline" size={64} color={colors.error} />
        <Text style={styles.errorTitle}>加载失败</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchListingDetails}>
          <Text style={styles.retryButtonText}>重试</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  // 如果没有数据
  if (!listing) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="database-off" size={64} color={colors.textSecondary} />
        <Text style={styles.errorTitle}>找不到数据列表</Text>
        <Text style={styles.errorMessage}>该数据列表可能已被删除或不再可用</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>返回市场</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <ScrollView>
        {/* 顶部图片 */}
        <View style={styles.imageContainer}>
          <Image
            source={
              listing.previewImageUrl 
                ? { uri: listing.previewImageUrl } 
                : require('../../assets/data-placeholder.png')
            }
            style={styles.coverImage}
          />
          <TouchableOpacity 
            style={styles.backButtonOverlay}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
        
        {/* 列表标题和提供者信息 */}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>{listing.title}</Text>
          
          <View style={styles.providerContainer}>
            <Image
              source={
                listing.provider.profilePicture 
                  ? { uri: listing.provider.profilePicture } 
                  : require('../../assets/avatar-placeholder.png')
              }
              style={styles.providerAvatar}
            />
            <View>
              <Text style={styles.providerName}>{listing.provider.username}</Text>
              <View style={styles.providerRating}>
                <Ionicons name="star" size={16} color={colors.warning} />
                <Text style={styles.providerRatingText}>
                  {listing.provider.reputationScore?.toFixed(1) || '暂无评分'}
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.viewProfileButton}
              onPress={() => navigation.navigate('UserProfile', { userId: listing.provider.id })}
            >
              <Text style={styles.viewProfileButtonText}>查看资料</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* 价格和购买按钮 */}
        <View style={styles.pricingContainer}>
          <View>
            <Text style={styles.priceLabel}>价格</Text>
            <Text style={styles.price}>{listing.price} BDF</Text>
          </View>
          <TouchableOpacity 
            style={styles.buyButton}
            onPress={handleShowPurchaseModal}
          >
            <Text style={styles.buyButtonText}>购买数据</Text>
          </TouchableOpacity>
        </View>
        
        {/* 标签 */}
        <View style={styles.tagsContainer}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{listing.dataType}</Text>
          </View>
          {listing.tags && listing.tags.map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
          {listing.featured && (
            <View style={[styles.tag, { backgroundColor: colors.warning }]}>
              <Text style={styles.tagText}>精选</Text>
            </View>
          )}
        </View>
        
        {/* 详细信息 */}
        <View style={styles.infoContainer}>
          <Text style={styles.sectionTitle}>详情</Text>
          <Text style={styles.description}>{listing.description}</Text>
          
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="calendar-range" size={20} color={colors.textSecondary} />
              <View>
                <Text style={styles.infoLabel}>数据时间范围</Text>
                <Text style={styles.infoValue}>
                  {new Date(listing.timeframe?.startDate).toLocaleDateString()} 至{' '}
                  {new Date(listing.timeframe?.endDate).toLocaleDateString()}
                </Text>
              </View>
            </View>
            
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="clock-outline" size={20} color={colors.textSecondary} />
              <View>
                <Text style={styles.infoLabel}>访问期限</Text>
                <Text style={styles.infoValue}>{listing.accessPeriod} 天</Text>
              </View>
            </View>
            
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="database" size={20} color={colors.textSecondary} />
              <View>
                <Text style={styles.infoLabel}>数据采集频率</Text>
                <Text style={styles.infoValue}>{listing.frequency || '未指定'}</Text>
              </View>
            </View>
            
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="shopping-outline" size={20} color={colors.textSecondary} />
              <View>
                <Text style={styles.infoLabel}>购买次数</Text>
                <Text style={styles.infoValue}>{listing.purchaseCount || 0} 次</Text>
              </View>
            </View>
          </View>
        </View>
        
        {/* 评分和评论 */}
        {listing.rating && (
          <View style={styles.ratingsContainer}>
            <Text style={styles.sectionTitle}>用户评价</Text>
            
            <View style={styles.ratingSummary}>
              <View style={styles.ratingScore}>
                <Text style={styles.ratingScoreValue}>
                  {listing.rating.averageScore?.toFixed(1) || '-'}
                </Text>
                <View style={styles.ratingStars}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <Ionicons 
                      key={star}
                      name={star <= Math.round(listing.rating.averageScore || 0) ? "star" : "star-outline"} 
                      size={16} 
                      color={colors.warning} 
                    />
                  ))}
                </View>
                <Text style={styles.ratingCount}>
                  {listing.rating.count || 0} 条评价
                </Text>
              </View>
              
              <View style={styles.ratingDistribution}>
                {[5, 4, 3, 2, 1].map(star => (
                  <View key={star} style={styles.ratingBar}>
                    <Text style={styles.ratingBarLabel}>{star}</Text>
                    <View style={styles.ratingBarContainer}>
                      <View 
                        style={[
                          styles.ratingBarFill, 
                          { 
                            width: `${
                              listing.rating.distribution && listing.rating.count
                                ? (listing.rating.distribution[star] || 0) / listing.rating.count * 100
                                : 0
                            }%` 
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.ratingBarCount}>
                      {listing.rating.distribution?.[star] || 0}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
            
            {/* 评论列表 - 可以在这里添加评论列表的组件 */}
          </View>
        )}
        
        {/* 底部空间 */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
      
      {/* 购买确认弹窗 */}
      <PurchaseConfirmationModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  errorMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
  },
  backButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  imageContainer: {
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: 200,
    backgroundColor: colors.lightGray,
  },
  backButtonOverlay: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: spacing.xs,
  },
  headerContainer: {
    padding: spacing.md,
    backgroundColor: colors.white,
    ...shadows.small,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  providerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: spacing.sm,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  providerRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerRatingText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  viewProfileButton: {
    marginLeft: 'auto',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 16,
    backgroundColor: colors.lightGray,
  },
  viewProfileButtonText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  pricingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.white,
    marginTop: 1,
    ...shadows.small,
  },
  priceLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.success,
  },
  buyButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
  },
  buyButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.md,
    backgroundColor: colors.white,
    marginTop: 1,
  },
  tag: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: spacing.sm,
    marginBottom: spacing.xs,
  },
  tagText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '500',
  },
  infoContainer: {
    padding: spacing.md,
    backgroundColor: colors.white,
    marginTop: spacing.md,
    ...shadows.small,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  infoItem: {
    flexDirection: 'row',
    width: '48%',
    marginBottom: spacing.md,
    alignItems: 'flex-start',
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    marginLeft: spacing.xs,
  },
  ratingsContainer: {
    padding: spacing.md,
    backgroundColor: colors.white,
    marginTop: spacing.md,
    ...shadows.small,
  },
  ratingSummary: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  ratingScore: {
    alignItems: 'center',
    padding: spacing.md,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    width: '30%',
  },
  ratingScoreValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  ratingStars: {
    flexDirection: 'row',
    marginVertical: spacing.xs,
  },
  ratingCount: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  ratingDistribution: {
    flex: 1,
    paddingLeft: spacing.md,
    justifyContent: 'space-between',
  },
  ratingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingBarLabel: {
    width: 20,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  ratingBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: colors.lightGray,
    borderRadius: 4,
    marginHorizontal: spacing.xs,
  },
  ratingBarFill: {
    height: 8,
    backgroundColor: colors.warning,
    borderRadius: 4,
  },
  ratingBarCount: {
    width: 30,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  bottomSpacer: {
    height: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    width: '85%',
    ...shadows.large,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  modalListingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.lightGray,
  },
  modalListingDetails: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  modalListingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  modalProviderText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  modalDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  modalPriceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  modalPriceLabel: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  modalPriceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  modalMessage: {
    flexDirection: 'row',
    backgroundColor: colors.lightGray,
    padding: spacing.sm,
    borderRadius: 8,
    marginVertical: spacing.md,
    alignItems: 'flex-start',
  },
  modalMessageText: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
    marginLeft: spacing.xs,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancelButton: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: 8,
    marginRight: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelButtonText: {
    color: colors.textPrimary,
    fontWeight: '500',
    fontSize: 16,
  },
  modalConfirmButton: {
    flex: 2,
    padding: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  modalConfirmButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default ListingDetailScreen; 