import React, { createContext, useState, useEffect, useContext } from 'react';
import { Platform, PermissionsAndroid, Alert, NativeEventEmitter, NativeModules } from 'react-native';
import BleManager from 'react-native-ble-manager';
import { Buffer } from 'buffer';
import RNFS from 'react-native-fs';
import { AuthContext } from './AuthContext';
import { API_URL } from '../config';

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

// Create context
export const DeviceContext = createContext();

// BodyDFi设备的服务和特征值UUID
const BODYDFI_SERVICE_UUID = '0xBDF1';
const BODYDFI_DATA_CHAR_UUID = '0xBDF11';
const BODYDFI_PROCESSED_DATA_CHAR_UUID = '0xBDF12';
const BODYDFI_CONTROL_CHAR_UUID = '0xBDF21';
const BODYDFI_CONFIG_CHAR_UUID = '0xBDF22';

// Device provider component
export const DeviceProvider = ({ children }) => {
  const { user, token } = useContext(AuthContext);
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState([]);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [deviceStatus, setDeviceStatus] = useState('disconnected'); // disconnected, connecting, connected, collecting
  const [permissions, setPermissions] = useState({
    bluetoothScan: false,
    bluetoothConnect: false,
    location: false
  });
  const [dataHistory, setDataHistory] = useState([]);
  const [registeredDevices, setRegisteredDevices] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [deviceType, setDeviceType] = useState(''); // basic, pro, medical
  const [deviceBattery, setDeviceBattery] = useState(0);
  const [deviceConfig, setDeviceConfig] = useState({
    samplingRate: 50,
    dataMode: 1,
    powerSaving: true
  });

  // 初始化BLE
  useEffect(() => {
    BleManager.start({ showAlert: false })
      .then(() => {
        console.log('BleManager initialized');
        checkAndRequestPermissions();
      })
      .catch(error => {
        console.error('BleManager initialization error:', error);
        setErrorMessage('无法初始化蓝牙管理器');
      });

  // 设置BLE事件监听器
  const listeners = [
    bleManagerEmitter.addListener('BleManagerDiscoverPeripheral', handleDiscoverPeripheral),
    bleManagerEmitter.addListener('BleManagerStopScan', handleStopScan),
    bleManagerEmitter.addListener('BleManagerDisconnectPeripheral', handleDisconnectedPeripheral),
    bleManagerEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', handleUpdateValueForCharacteristic)
  ];

  if (user && token) {
    fetchRegisteredDevices();
  }

  return () => {
    // 清理监听器
    for (const listener of listeners) {
      listener.remove();
    }
    
    // 确保断开设备连接
    if (connectedDevice) {
      BleManager.disconnect(connectedDevice.id);
    }
  };
}, [user, token]);

// 权限检查和请求
const checkAndRequestPermissions = async () => {
  if (Platform.OS === 'android') {
    // 检查和请求Android权限
    try {
      const bluetoothScanGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        {
          title: '蓝牙扫描权限',
          message: 'BodyDFi需要蓝牙扫描权限来发现可穿戴设备',
          buttonPositive: '授权',
        }
      );
      
      const bluetoothConnectGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        {
          title: '蓝牙连接权限',
          message: 'BodyDFi需要蓝牙连接权限来连接到可穿戴设备',
          buttonPositive: '授权',
        }
      );
      
      const locationGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: '位置权限',
          message: '蓝牙扫描需要位置权限',
          buttonPositive: '授权',
        }
      );

      setPermissions({
        bluetoothScan: bluetoothScanGranted === PermissionsAndroid.RESULTS.GRANTED,
        bluetoothConnect: bluetoothConnectGranted === PermissionsAndroid.RESULTS.GRANTED,
        location: locationGranted === PermissionsAndroid.RESULTS.GRANTED
      });

      if (
        bluetoothScanGranted !== PermissionsAndroid.RESULTS.GRANTED ||
        bluetoothConnectGranted !== PermissionsAndroid.RESULTS.GRANTED ||
        locationGranted !== PermissionsAndroid.RESULTS.GRANTED
      ) {
        setErrorMessage('缺少必要权限，部分功能可能无法使用');
      }
    } catch (error) {
      console.error('权限请求错误:', error);
      setErrorMessage('权限请求失败');
    }
  } else {
    // iOS权限处理
    setPermissions({
      bluetoothScan: true,
      bluetoothConnect: true,
      location: true
    });
  }
};

// 获取已注册设备
const fetchRegisteredDevices = async () => {
  if (!token) return;
  
  try {
    const response = await fetch(`${API_URL}/devices`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      setRegisteredDevices(data.devices || []);
    } else {
      console.error('获取注册设备失败:', await response.text());
    }
  } catch (error) {
    console.error('获取注册设备错误:', error);
  }
};

// 处理发现设备
const handleDiscoverPeripheral = (peripheral) => {
  if (!peripheral.name) return;
  
  // 仅添加BodyDFi设备（名称以BodyDFi开头）
  if (peripheral.name.startsWith('BodyDFi')) {
    // 检查设备是否已在列表中
    const deviceExists = discoveredDevices.some(device => device.id === peripheral.id);
    if (!deviceExists) {
      setDiscoveredDevices(prevDevices => [...prevDevices, peripheral]);
    }
  }
};

// 处理停止扫描
const handleStopScan = () => {
  setIsScanning(false);
  console.log('Scan stopped');
};

// 处理设备断开连接
const handleDisconnectedPeripheral = (data) => {
  if (connectedDevice && data.peripheral === connectedDevice.id) {
    setConnectedDevice(null);
    setDeviceStatus('disconnected');
    setDeviceBattery(0);
    Alert.alert('设备已断开连接', `${data.peripheral} 已断开连接`);
  }
};

// 处理特征值更新
const handleUpdateValueForCharacteristic = (data) => {
  console.log(`Received data from ${data.peripheral} characteristic ${data.characteristic}`);
  const value = Buffer.from(data.value, 'base64');
  
  if (data.characteristic === BODYDFI_DATA_CHAR_UUID) {
    // 处理传感器原始数据
    try {
      const jsonData = JSON.parse(value.toString());
      // 将数据添加到历史记录
      setDataHistory(prev => [...prev, {
        timestamp: jsonData.timestamp || Date.now(),
        data: jsonData,
        type: 'raw'
      }]);
    } catch (error) {
      console.error('解析传感器数据错误:', error);
    }
  } else if (data.characteristic === BODYDFI_PROCESSED_DATA_CHAR_UUID) {
    // 处理处理后的数据
    try {
      const jsonData = JSON.parse(value.toString());
      // 添加到历史记录
      setDataHistory(prev => [...prev, {
        timestamp: jsonData.timestamp || Date.now(),
        data: jsonData,
        type: 'processed'
      }]);
      
      // 如果设备连接并且数据收集中，将数据上传到区块链
      if (deviceStatus === 'collecting' && user && token) {
        uploadDataToBlockchain(jsonData);
      }
    } catch (error) {
      console.error('解析处理数据错误:', error);
    }
  } else if (data.characteristic.toLowerCase() === '2a19') {
    // 电池电量特征值更新
    const batteryLevel = value.readUInt8(0);
    setDeviceBattery(batteryLevel);
  }
};

// 上传数据到区块链
const uploadDataToBlockchain = async (data) => {
  if (!user || !token || !connectedDevice) return;
  
  try {
    const response = await fetch(`${API_URL}/data/submit`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        deviceId: connectedDevice.id,
        timestamp: data.timestamp || Date.now(),
        dataType: deviceType,
        metrics: {
          acceleration: data.accel,
          gyroscope: data.gyro,
          heartRate: data.heart_rate,
          activityLevel: data.activity_level
        }
      })
    });
    
    if (!response.ok) {
      console.error('上传数据失败:', await response.text());
    }
  } catch (error) {
    console.error('上传数据错误:', error);
  }
};

// 扫描设备
const scanForDevices = () => {
  if (!permissions.bluetoothScan || !permissions.location) {
    setErrorMessage('缺少蓝牙扫描权限或位置权限');
    return;
  }

  if (isScanning) {
    return;
  }

  // 清空之前发现的设备
  setDiscoveredDevices([]);
  setErrorMessage('');

  BleManager.scan([], 5, true)
    .then(() => {
      console.log('Scanning started');
      setIsScanning(true);
    })
    .catch(error => {
      console.error('Scanning error:', error);
      setErrorMessage('扫描设备失败');
      setIsScanning(false);
    });
};

// 连接到设备
const connectToDevice = async (device) => {
  if (!permissions.bluetoothConnect) {
    setErrorMessage('缺少蓝牙连接权限');
    return false;
  }

  setDeviceStatus('connecting');
  
  try {
    // 连接设备
    await BleManager.connect(device.id);
    console.log('Connected to device');
    
    // 获取服务和特征
    await BleManager.retrieveServices(device.id);
    console.log('Retrieved services');
    
    // 启用传感器数据通知
    await BleManager.startNotification(device.id, BODYDFI_SERVICE_UUID, BODYDFI_PROCESSED_DATA_CHAR_UUID);
    
    // 读取设备类型
    const deviceInfoService = '180a';
    const modelNumberCharacteristic = '2a24';
    const deviceTypeData = await BleManager.read(device.id, deviceInfoService, modelNumberCharacteristic);
    const deviceTypeStr = Buffer.from(deviceTypeData).toString();
    
    // 根据型号确定设备类型
    if (deviceTypeStr.includes('Pro')) {
      setDeviceType('pro');
    } else if (deviceTypeStr.includes('Medical')) {
      setDeviceType('medical');
    } else {
      setDeviceType('basic');
    }
    
    // 读取电池电量
    const batteryService = '180f';
    const batteryLevelCharacteristic = '2a19';
    const batteryData = await BleManager.read(device.id, batteryService, batteryLevelCharacteristic);
    const batteryLevel = batteryData[0];
    setDeviceBattery(batteryLevel);
    
    // 启用电池电量通知
    await BleManager.startNotification(device.id, batteryService, batteryLevelCharacteristic);
    
    setConnectedDevice(device);
    setDeviceStatus('connected');
    
    // 如果设备已注册，发送配置
    const registeredDevice = registeredDevices.find(d => d.deviceId === device.id);
    if (registeredDevice) {
      await sendDeviceConfig({
        samplingRate: registeredDevice.config?.samplingRate || 50,
        dataMode: registeredDevice.config?.dataMode || 1,
        powerSaving: registeredDevice.config?.powerSaving || true
      });
    }
    
    return true;
  } catch (error) {
    console.error('Connection error:', error);
    setErrorMessage(`连接设备失败: ${error.message}`);
    setDeviceStatus('disconnected');
    return false;
  }
};

// 断开设备连接
const disconnectDevice = async () => {
  if (!connectedDevice) return;
  
  try {
    // 如果正在收集数据，先停止
    if (deviceStatus === 'collecting') {
      await stopDataCollection();
    }
    
    // 停止通知
    await BleManager.stopNotification(connectedDevice.id, BODYDFI_SERVICE_UUID, BODYDFI_PROCESSED_DATA_CHAR_UUID);
    const batteryService = '180f';
    const batteryLevelCharacteristic = '2a19';
    await BleManager.stopNotification(connectedDevice.id, batteryService, batteryLevelCharacteristic);
    
    // 断开连接
    await BleManager.disconnect(connectedDevice.id);
    setConnectedDevice(null);
    setDeviceStatus('disconnected');
    setDeviceBattery(0);
  } catch (error) {
    console.error('Disconnection error:', error);
    setErrorMessage(`断开设备失败: ${error.message}`);
  }
};

// 注册设备
const registerDevice = async (type, details) => {
  if (!user || !token || !connectedDevice) return false;
  
  try {
    const response = await fetch(`${API_URL}/devices/register`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        deviceId: connectedDevice.id,
        deviceName: details.name || connectedDevice.name,
        deviceType: type || deviceType,
        config: {
          samplingRate: deviceConfig.samplingRate,
          dataMode: deviceConfig.dataMode,
          powerSaving: deviceConfig.powerSaving
        }
      })
    });
    
    if (response.ok) {
      await fetchRegisteredDevices();
      return true;
    } else {
      const errorText = await response.text();
      console.error('设备注册失败:', errorText);
      setErrorMessage(`注册设备失败: ${errorText}`);
      return false;
    }
  } catch (error) {
    console.error('设备注册错误:', error);
    setErrorMessage(`注册设备错误: ${error.message}`);
    return false;
  }
};

// 发送设备配置
const sendDeviceConfig = async (config) => {
  if (!connectedDevice || deviceStatus !== 'connected') return false;
  
  try {
    // 更新本地配置
    setDeviceConfig(config);
    
    // 准备配置命令
    const configCmd = {
      cmd: "CONFIG",
      params: {
        acc_rate: config.samplingRate,
        gyro_rate: config.samplingRate,
        hr_rate: Math.floor(config.samplingRate / 5), // 心率采样率通常较低
        data_mode: config.dataMode,
        power_saving: config.powerSaving ? 1 : 0
      }
    };
    
    // 发送配置到设备
    const data = Buffer.from(JSON.stringify(configCmd));
    await BleManager.write(
      connectedDevice.id,
      BODYDFI_SERVICE_UUID,
      BODYDFI_CONFIG_CHAR_UUID,
      [...data]
    );
    
    console.log('配置发送成功');
    return true;
  } catch (error) {
    console.error('发送配置错误:', error);
    setErrorMessage(`发送配置失败: ${error.message}`);
    return false;
  }
};

// 开始数据采集
const startDataCollection = () => {
  if (!connectedDevice || deviceStatus !== 'connected') return;
  
  try {
    // 准备开始采集命令
    const startCmd = {
      cmd: "START_COLLECTION",
      params: {}
    };
    
    // 发送命令到设备
    const data = Buffer.from(JSON.stringify(startCmd));
    BleManager.write(
      connectedDevice.id,
      BODYDFI_SERVICE_UUID,
      BODYDFI_CONTROL_CHAR_UUID,
      [...data]
    ).then(() => {
      console.log('数据采集已启动');
      setDeviceStatus('collecting');
    }).catch(error => {
      console.error('启动采集错误:', error);
      setErrorMessage(`启动数据采集失败: ${error.message}`);
    });
  } catch (error) {
    console.error('启动采集错误:', error);
    setErrorMessage(`启动数据采集失败: ${error.message}`);
  }
};

// 停止数据采集
const stopDataCollection = () => {
  if (!connectedDevice || deviceStatus !== 'collecting') return;
  
  try {
    // 准备停止采集命令
    const stopCmd = {
      cmd: "STOP_COLLECTION",
      params: {}
    };
    
    // 发送命令到设备
    const data = Buffer.from(JSON.stringify(stopCmd));
    BleManager.write(
      connectedDevice.id,
      BODYDFI_SERVICE_UUID,
      BODYDFI_CONTROL_CHAR_UUID,
      [...data]
    ).then(() => {
      console.log('数据采集已停止');
      setDeviceStatus('connected');
    }).catch(error => {
      console.error('停止采集错误:', error);
      setErrorMessage(`停止数据采集失败: ${error.message}`);
    });
  } catch (error) {
    console.error('停止采集错误:', error);
    setErrorMessage(`停止数据采集失败: ${error.message}`);
  }
};

// 清空数据历史
const clearDataHistory = async () => {
  setDataHistory([]);
};

// 导出数据为JSON
const exportDataAsJson = () => {
  if (dataHistory.length === 0) {
    Alert.alert('导出失败', '没有数据可导出');
    return;
  }
  
  const jsonData = JSON.stringify(dataHistory, null, 2);
  const path = `${RNFS.DocumentDirectoryPath}/bodydfi_data_${Date.now()}.json`;
  
  RNFS.writeFile(path, jsonData, 'utf8')
    .then(() => {
      Alert.alert('导出成功', `数据已保存到: ${path}`);
    })
    .catch(error => {
      console.error('导出数据错误:', error);
      Alert.alert('导出失败', `错误: ${error.message}`);
    });
};

// 检测是否是已注册设备
const isDeviceRegistered = (deviceId) => {
  return registeredDevices.some(device => device.deviceId === deviceId);
};

// The context value
const value = {
  isScanning,
  discoveredDevices,
  connectedDevice,
  deviceStatus,
  permissions,
  dataHistory,
  registeredDevices,
  errorMessage,
  deviceType,
  deviceBattery,
  deviceConfig,
  scanForDevices,
  connectToDevice,
  disconnectDevice,
  registerDevice,
  sendDeviceConfig,
  startDataCollection,
  stopDataCollection,
  clearDataHistory,
  exportDataAsJson,
  isDeviceRegistered
};

return (
  <DeviceContext.Provider value={value}>
    {children}
  </DeviceContext.Provider>
);
}; 