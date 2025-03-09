import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  Image,
  Alert,
  FlatList,
  Modal,
  TextInput
} from 'react-native';
import { MaterialCommunityIcons } from 'react-native-vector-icons';
import { DeviceContext } from '../contexts/DeviceContext';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SIZES } from '../constants';

const DeviceScreen = () => {
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);
  const {
    deviceType,
    deviceData,
    sensorData,
    isScanning,
    connectedDevice,
    dataCollectionActive,
    permissions,
    bleEnabled,
    scanForDevices,
    disconnectDevice,
    startDataCollection,
    stopDataCollection,
    discoveredDevices,
    deviceStatus,
    dataHistory,
    registeredDevices,
    errorMessage,
    deviceBattery,
    deviceConfig,
    registerDevice,
    sendDeviceConfig,
    isDeviceRegistered,
    exportDataAsJson
  } = useContext(DeviceContext);
  
  const [isCollecting, setIsCollecting] = useState(dataCollectionActive);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerName, setRegisterName] = useState('');
  const [selectedDeviceType, setSelectedDeviceType] = useState('');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configSettings, setConfigSettings] = useState({
    samplingRate: 50,
    dataMode: 1,
    powerSaving: true
  });
  
  // Update local state when context changes
  useEffect(() => {
    setIsCollecting(dataCollectionActive);
  }, [dataCollectionActive]);
  
  // 当连接设备时更新配置设置
  useEffect(() => {
    if (connectedDevice && deviceStatus === 'connected') {
      setConfigSettings(deviceConfig);
    }
  }, [connectedDevice, deviceStatus, deviceConfig]);
  
  // Helper function to get device type name
  const getDeviceTypeName = () => {
    switch (deviceType) {
      case 'basic':
        return 'BodyDFi Sensor™ (基础版)';
      case 'pro':
        return 'BodyDFi Pro™ (专业版)';
      case 'medical':
        return 'BodyDFi Medical™ (医疗版)';
      default:
        return '未知设备类型';
    }
  };
  
  // Helper function to determine if all required permissions are granted
  const arePermissionsGranted = () => {
    return permissions.bluetooth && permissions.location && permissions.sensors;
  };
  
  // Handler for toggling data collection
  const handleDataCollectionToggle = () => {
    if (deviceStatus === 'connected') {
      startDataCollection();
    } else if (deviceStatus === 'collecting') {
      stopDataCollection();
    }
  };
  
  // Handler for scan button press
  const handleScanPress = () => {
    if (!bleEnabled) {
      Alert.alert('蓝牙未启用', '请启用蓝牙以扫描设备');
      return;
    }
    
    if (!arePermissionsGranted()) {
      Alert.alert('权限缺失', '请授予所需权限以使用设备功能');
      return;
    }
    
    scanForDevices();
  };
  
  // Handler for setup button press
  const handleSetupPress = () => {
    if (!connectedDevice) return;
    
    if (isDeviceRegistered(connectedDevice.id)) {
      // 已注册设备，显示配置模态框
      setShowConfigModal(true);
    } else {
      // 未注册设备，显示注册模态框
      setRegisterName(connectedDevice.name || '');
      setSelectedDeviceType(deviceType);
      setShowRegisterModal(true);
    }
  };
  
  // 提交设备注册
  const handleRegisterSubmit = async () => {
    if (!registerName.trim()) {
      alert('请输入设备名称');
      return;
    }
    
    const success = await registerDevice(selectedDeviceType, {
      name: registerName
    });
    
    if (success) {
      setShowRegisterModal(false);
      alert('设备注册成功');
    }
  };
  
  // 提交配置修改
  const handleConfigSubmit = async () => {
    const success = await sendDeviceConfig(configSettings);
    
    if (success) {
      setShowConfigModal(false);
      alert('设备配置已更新');
    }
  };
  
  // 渲染设备列表项
  const renderDeviceItem = ({ item }) => {
    const isRegistered = isDeviceRegistered(item.id);
    
    return (
      <TouchableOpacity
        style={[
          styles.deviceItem,
          connectedDevice && item.id === connectedDevice.id && styles.deviceItemActive
        ]}
        onPress={() => {
          if (!connectedDevice || item.id !== connectedDevice.id) {
            connectToDevice(item);
          }
        }}
        disabled={deviceStatus === 'connecting'}
      >
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceName}>{item.name}</Text>
          <Text style={styles.deviceId}>ID: {item.id}</Text>
          <Text style={styles.deviceRssi}>信号强度: {item.rssi} dBm</Text>
          {isRegistered && (
            <View style={styles.registeredBadge}>
              <Text style={styles.registeredText}>已注册</Text>
            </View>
          )}
        </View>
        <View style={styles.deviceAction}>
          {connectedDevice && item.id === connectedDevice.id ? (
            <MaterialCommunityIcons name="bluetooth-connect" size={24} color={COLORS.primary} />
          ) : (
            <MaterialCommunityIcons name="bluetooth" size={24} color={COLORS.gray} />
          )}
        </View>
      </TouchableOpacity>
    );
  };
  
  // 渲染设备状态区域
  const renderDeviceStatus = () => {
    if (!connectedDevice) {
      return (
        <View style={styles.noDeviceContainer}>
          <MaterialCommunityIcons name="bluetooth-off" size={64} color={COLORS.gray} />
          <Text style={styles.noDeviceText}>未连接任何设备</Text>
          <Text style={styles.noDeviceSubText}>请扫描并连接BodyDFi设备</Text>
        </View>
      );
    }

    return (
      <View style={styles.connectedDeviceContainer}>
        <View style={styles.deviceHeader}>
          <View>
            <Text style={styles.connectedDeviceTitle}>{connectedDevice.name}</Text>
            <Text style={styles.deviceTypeText}>{getDeviceTypeName()}</Text>
          </View>
          <View style={styles.batteryContainer}>
            <MaterialCommunityIcons 
              name={deviceBattery > 20 ? "battery" : "battery-alert"} 
              size={24} 
              color={deviceBattery > 20 ? COLORS.success : COLORS.error} 
            />
            <Text style={styles.batteryText}>{deviceBattery}%</Text>
          </View>
        </View>
        
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>状态:</Text>
          <View style={styles.statusBadge}>
            <View 
              style={[
                styles.statusIndicator, 
                deviceStatus === 'connected' ? styles.statusConnected : 
                deviceStatus === 'collecting' ? styles.statusCollecting :
                styles.statusConnecting
              ]} 
            />
            <Text style={styles.statusText}>
              {deviceStatus === 'connected' ? '已连接' : 
               deviceStatus === 'collecting' ? '数据采集中' :
               deviceStatus === 'connecting' ? '连接中...' : '未知状态'}
            </Text>
          </View>
        </View>
        
        <View style={styles.dataStatsContainer}>
          <View style={styles.dataStat}>
            <Text style={styles.dataStatValue}>{dataHistory.length}</Text>
            <Text style={styles.dataStatLabel}>数据点</Text>
          </View>
          <View style={styles.dataStat}>
            <Text style={styles.dataStatValue}>
              {dataHistory.length > 0 ? 
                Math.round((Date.now() - dataHistory[0].timestamp) / 60000) : 0}
            </Text>
            <Text style={styles.dataStatLabel}>采集分钟</Text>
          </View>
          <View style={styles.dataStat}>
            <Text style={styles.dataStatValue}>
              {isDeviceRegistered(connectedDevice.id) ? '已注册' : '未注册'}
            </Text>
            <Text style={styles.dataStatLabel}>状态</Text>
          </View>
        </View>
        
        <View style={styles.controlsContainer}>
          <TouchableOpacity 
            style={[
              styles.controlButton,
              deviceStatus !== 'connected' && deviceStatus !== 'collecting' && styles.controlButtonDisabled
            ]}
            onPress={handleDataCollectionToggle}
            disabled={deviceStatus !== 'connected' && deviceStatus !== 'collecting'}
          >
            <MaterialCommunityIcons 
              name={deviceStatus === 'collecting' ? "stop-circle-outline" : "play-circle-outline"} 
              size={24} 
              color={COLORS.white} 
            />
            <Text style={styles.controlButtonText}>
              {deviceStatus === 'collecting' ? '停止采集' : '开始采集'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.controlButton,
              deviceStatus !== 'connected' && styles.controlButtonDisabled
            ]}
            onPress={handleSetupPress}
            disabled={deviceStatus !== 'connected'}
          >
            <MaterialCommunityIcons name="cog-outline" size={24} color={COLORS.white} />
            <Text style={styles.controlButtonText}>设备设置</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={disconnectDevice}
            disabled={!connectedDevice}
          >
            <MaterialCommunityIcons name="bluetooth-off" size={24} color={COLORS.white} />
            <Text style={styles.controlButtonText}>断开连接</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.dataActionsContainer}>
          <TouchableOpacity 
            style={[styles.dataActionButton, dataHistory.length === 0 && styles.dataActionButtonDisabled]}
            onPress={clearDataHistory}
            disabled={dataHistory.length === 0}
          >
            <MaterialCommunityIcons name="delete-outline" size={20} color={COLORS.error} />
            <Text style={styles.dataActionButtonText}>清除数据</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.dataActionButton, dataHistory.length === 0 && styles.dataActionButtonDisabled]}
            onPress={exportDataAsJson}
            disabled={dataHistory.length === 0}
          >
            <MaterialCommunityIcons name="export" size={20} color={COLORS.primary} />
            <Text style={styles.dataActionButtonText}>导出数据</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>设备管理</Text>
        {errorMessage ? (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle-outline" size={20} color={COLORS.error} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}
      </View>
      
      {/* 设备状态区域 */}
      {renderDeviceStatus()}
      
      {/* 扫描按钮区域 */}
      <View style={styles.scanContainer}>
        <TouchableOpacity 
          style={[styles.scanButton, isScanning && styles.scanningButton]}
          onPress={handleScanPress}
          disabled={isScanning || deviceStatus === 'connecting'}
        >
          {isScanning ? (
            <>
              <ActivityIndicator size="small" color={COLORS.white} />
              <Text style={styles.scanButtonText}>扫描中...</Text>
            </>
          ) : (
            <>
              <MaterialCommunityIcons name="bluetooth-search" size={24} color={COLORS.white} />
              <Text style={styles.scanButtonText}>扫描设备</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      
      {/* 设备列表区域 */}
      {discoveredDevices.length > 0 && (
        <View style={styles.devicesContainer}>
          <Text style={styles.sectionTitle}>
            发现的设备 ({discoveredDevices.length})
          </Text>
          <FlatList
            data={discoveredDevices}
            renderItem={renderDeviceItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.devicesList}
          />
        </View>
      )}
      
      {/* 注册设备模态框 */}
      <Modal
        visible={showRegisterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRegisterModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>注册设备</Text>
            
            <Text style={styles.modalLabel}>设备名称</Text>
            <TextInput
              style={styles.modalInput}
              value={registerName}
              onChangeText={setRegisterName}
              placeholder="输入设备名称"
            />
            
            <Text style={styles.modalLabel}>设备类型</Text>
            <View style={styles.typeButtonsContainer}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  selectedDeviceType === 'basic' && styles.typeButtonSelected
                ]}
                onPress={() => setSelectedDeviceType('basic')}
              >
                <Text style={[
                  styles.typeButtonText,
                  selectedDeviceType === 'basic' && styles.typeButtonTextSelected
                ]}>基础版</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  selectedDeviceType === 'pro' && styles.typeButtonSelected
                ]}
                onPress={() => setSelectedDeviceType('pro')}
              >
                <Text style={[
                  styles.typeButtonText,
                  selectedDeviceType === 'pro' && styles.typeButtonTextSelected
                ]}>专业版</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  selectedDeviceType === 'medical' && styles.typeButtonSelected
                ]}
                onPress={() => setSelectedDeviceType('medical')}
              >
                <Text style={[
                  styles.typeButtonText,
                  selectedDeviceType === 'medical' && styles.typeButtonTextSelected
                ]}>医疗版</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowRegisterModal(false)}
              >
                <Text style={styles.modalButtonText}>取消</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSubmitButton]}
                onPress={handleRegisterSubmit}
              >
                <Text style={[styles.modalButtonText, styles.modalSubmitButtonText]}>注册</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* 配置设备模态框 */}
      <Modal
        visible={showConfigModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowConfigModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>设备配置</Text>
            
            <Text style={styles.modalLabel}>采样率 (Hz)</Text>
            <View style={styles.sliderContainer}>
              <TouchableOpacity
                style={styles.sliderButton}
                onPress={() => setConfigSettings(prev => ({
                  ...prev,
                  samplingRate: Math.max(10, prev.samplingRate - 10)
                }))}
              >
                <MaterialCommunityIcons name="minus" size={20} color={COLORS.primary} />
              </TouchableOpacity>
              
              <Text style={styles.sliderValue}>{configSettings.samplingRate}</Text>
              
              <TouchableOpacity
                style={styles.sliderButton}
                onPress={() => setConfigSettings(prev => ({
                  ...prev,
                  samplingRate: Math.min(200, prev.samplingRate + 10)
                }))}
              >
                <MaterialCommunityIcons name="plus" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalLabel}>数据模式</Text>
            <View style={styles.dataModeContainer}>
              <TouchableOpacity
                style={[
                  styles.dataModeButton,
                  configSettings.dataMode === 0 && styles.dataModeButtonSelected
                ]}
                onPress={() => setConfigSettings(prev => ({ ...prev, dataMode: 0 }))}
              >
                <Text style={styles.dataModeButtonText}>原始数据</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.dataModeButton,
                  configSettings.dataMode === 1 && styles.dataModeButtonSelected
                ]}
                onPress={() => setConfigSettings(prev => ({ ...prev, dataMode: 1 }))}
              >
                <Text style={styles.dataModeButtonText}>处理数据</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.dataModeButton,
                  configSettings.dataMode === 2 && styles.dataModeButtonSelected
                ]}
                onPress={() => setConfigSettings(prev => ({ ...prev, dataMode: 2 }))}
              >
                <Text style={styles.dataModeButtonText}>全部数据</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>电源节能模式</Text>
              <Switch
                value={configSettings.powerSaving}
                onValueChange={(value) => setConfigSettings(prev => ({
                  ...prev,
                  powerSaving: value
                }))}
                trackColor={{ false: COLORS.gray, true: COLORS.primary }}
                thumbColor={configSettings.powerSaving ? COLORS.white : COLORS.lightGray}
              />
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowConfigModal(false)}
              >
                <Text style={styles.modalButtonText}>取消</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSubmitButton]}
                onPress={handleConfigSubmit}
              >
                <Text style={[styles.modalButtonText, styles.modalSubmitButtonText]}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 5,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    padding: 10,
    backgroundColor: COLORS.errorLight,
    borderRadius: 8,
  },
  errorText: {
    color: COLORS.error,
    marginLeft: 8,
    flex: 1,
  },
  noDeviceContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noDeviceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginTop: 16,
  },
  noDeviceSubText: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 8,
  },
  connectedDeviceContainer: {
    padding: 20,
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  connectedDeviceTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  deviceTypeText: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 4,
  },
  batteryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  batteryText: {
    marginLeft: 5,
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 16,
    color: COLORS.dark,
    marginRight: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5,
  },
  statusConnected: {
    backgroundColor: COLORS.success,
  },
  statusCollecting: {
    backgroundColor: COLORS.primary,
  },
  statusConnecting: {
    backgroundColor: COLORS.warning,
  },
  statusText: {
    fontSize: 14,
    color: COLORS.dark,
  },
  dataStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  dataStat: {
    alignItems: 'center',
  },
  dataStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  dataStatLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  controlButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
    flexDirection: 'row',
  },
  controlButtonDisabled: {
    backgroundColor: COLORS.gray,
  },
  controlButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    marginLeft: 5,
    fontSize: 14,
  },
  dataActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dataActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
  },
  dataActionButtonDisabled: {
    opacity: 0.5,
  },
  dataActionButtonText: {
    marginLeft: 5,
    fontSize: 14,
  },
  scanContainer: {
    padding: 20,
    alignItems: 'center',
  },
  scanButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '80%',
  },
  scanningButton: {
    backgroundColor: COLORS.gray,
  },
  scanButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  devicesContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: COLORS.dark,
  },
  devicesList: {
    paddingBottom: 20,
  },
  deviceItem: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  deviceItemActive: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  deviceId: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  deviceRssi: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  deviceAction: {
    marginLeft: 10,
  },
  registeredBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  registeredText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '85%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 16,
    color: COLORS.dark,
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
    fontSize: 16,
  },
  typeButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  typeButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  typeButtonText: {
    color: COLORS.dark,
  },
  typeButtonTextSelected: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  modalCancelButton: {
    backgroundColor: COLORS.lightGray,
  },
  modalSubmitButton: {
    backgroundColor: COLORS.primary,
  },
  modalButtonText: {
    fontWeight: 'bold',
  },
  modalSubmitButtonText: {
    color: COLORS.white,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  sliderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  dataModeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dataModeButton: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  dataModeButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dataModeButtonText: {
    fontSize: 12,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  switchLabel: {
    fontSize: 16,
    color: COLORS.dark,
  },
});

export default DeviceScreen; 