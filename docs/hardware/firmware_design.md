# BodyDFi Sensor 固件设计文档

## 固件概述

BodyDFi Sensor固件是运行在ESP32微控制器上的嵌入式软件，负责管理传感器数据采集、处理和通过BLE传输数据到用户的移动设备。固件设计注重低功耗、可靠性和安全性，确保良好的用户体验和数据质量。

## 系统架构

### 软件架构

![固件架构图](../diagrams/firmware_architecture.svg)

固件采用分层架构设计：

1. **硬件抽象层 (HAL)**
   - ESP32驱动
   - 外设驱动
   - 传感器驱动
   - 电源管理

2. **操作系统层**
   - FreeRTOS
   - 任务管理
   - 内存管理
   - 中断处理

3. **中间件层**
   - BLE协议栈
   - 数据处理库
   - 加密库
   - 存储管理

4. **应用层**
   - 设备管理
   - 数据采集
   - 数据传输
   - 配置管理
   - OTA更新

### 任务结构

固件基于FreeRTOS实现多任务并发操作，主要包括以下任务：

| 任务名称 | 优先级 | 堆栈大小 | 功能描述 |
|---------|-------|---------|--------|
| MainTask | 5 | 4096 | 系统初始化和主控制流程 |
| SensorTask | 4 | 2048 | 传感器数据采集和预处理 |
| ProcessingTask | 3 | 4096 | 数据处理和特征提取 |
| BleTask | 4 | 4096 | 蓝牙通信管理 |
| StorageTask | 2 | 2048 | 本地数据存储管理 |
| PowerMgmtTask | 5 | 1024 | 电源管理和低功耗控制 |
| WatchdogTask | 6 | 1024 | 系统监控和看门狗 |

### 状态机

系统核心基于状态机实现控制逻辑：

![状态机图](../diagrams/firmware_state_machine.svg)

主要状态：

- **INIT**：系统初始化
- **IDLE**：低功耗等待状态
- **SCANNING**：BLE扫描模式
- **PAIRING**：设备配对状态
- **CONNECTED**：已连接状态
- **ACTIVE**：数据采集活动状态
- **OTA_UPDATE**：固件更新状态
- **ERROR**：错误状态

## 硬件驱动

### 传感器驱动

#### MPU-6050 (IMU)

- **通信协议**：I2C
- **采样率**：50Hz (可配置)
- **数据格式**：
  - 加速度：16位，±2g/±4g/±8g/±16g可配置
  - 陀螺仪：16位，±250/±500/±1000/±2000 度/秒可配置
- **中断**：数据就绪中断，运动检测中断
- **功耗模式**：正常模式，低功耗模式，周期采样模式

```c
// MPU-6050初始化函数
esp_err_t mpu6050_init(i2c_port_t i2c_num, uint8_t addr)
{
    // 复位设备
    I2C_WRITE_REG(i2c_num, addr, MPU6050_PWR_MGMT_1, 0x80);
    vTaskDelay(pdMS_TO_TICKS(100));
    
    // 唤醒设备，选择陀螺仪时钟
    I2C_WRITE_REG(i2c_num, addr, MPU6050_PWR_MGMT_1, 0x01);
    
    // 配置采样率为50Hz
    I2C_WRITE_REG(i2c_num, addr, MPU6050_SMPLRT_DIV, 0x13);
    
    // 配置数字低通滤波器
    I2C_WRITE_REG(i2c_num, addr, MPU6050_CONFIG, 0x03);
    
    // 配置陀螺仪量程为±2000度/秒
    I2C_WRITE_REG(i2c_num, addr, MPU6050_GYRO_CONFIG, 0x18);
    
    // 配置加速度计量程为±8g
    I2C_WRITE_REG(i2c_num, addr, MPU6050_ACCEL_CONFIG, 0x10);
    
    // 启用数据就绪中断
    I2C_WRITE_REG(i2c_num, addr, MPU6050_INT_ENABLE, 0x01);
    
    return ESP_OK;
}
```

#### MAX30101 (光电容积脉搏波描记传感器)

- **通信协议**：I2C
- **采样率**：10Hz (心率监测)
- **功能**：心率监测，血氧饱和度监测
- **LED配置**：红色LED (660nm)，红外LED (880nm)
- **中断**：FIFO几乎满中断，数据就绪中断

```c
// MAX30101初始化函数
esp_err_t max30101_init(i2c_port_t i2c_num, uint8_t addr)
{
    // 复位设备
    I2C_WRITE_REG(i2c_num, addr, MAX30101_MODE_CONFIG, 0x40);
    vTaskDelay(pdMS_TO_TICKS(100));
    
    // 配置FIFO
    I2C_WRITE_REG(i2c_num, addr, MAX30101_FIFO_CONFIG, 0x00);
    
    // 配置SPO2模式
    I2C_WRITE_REG(i2c_num, addr, MAX30101_SPO2_CONFIG, 0x27);
    
    // 配置LED脉冲幅度
    I2C_WRITE_REG(i2c_num, addr, MAX30101_LED1_PA, 0x24);  // 红色LED
    I2C_WRITE_REG(i2c_num, addr, MAX30101_LED2_PA, 0x24);  // 红外LED
    
    // 启用中断
    I2C_WRITE_REG(i2c_num, addr, MAX30101_INT_ENABLE, 0x80);
    
    // 设置工作模式为SPO2模式
    I2C_WRITE_REG(i2c_num, addr, MAX30101_MODE_CONFIG, 0x03);
    
    return ESP_OK;
}
```

### 电源管理

- **电池监控**：通过ADC监测电池电压
- **充电管理**：监测充电状态
- **低功耗模式**：
  - 轻度睡眠：CPU降频，外设活跃
  - 深度睡眠：CPU停止，只有RTC和选定外设工作
  - 休眠唤醒：定时器唤醒或中断唤醒

```c
// 电源管理初始化
void power_management_init()
{
    // 配置ADC用于电池电压监测
    adc1_config_width(ADC_WIDTH_BIT_12);
    adc1_config_channel_atten(BATTERY_ADC_CHANNEL, ADC_ATTEN_DB_11);
    
    // 配置GPIO用于充电状态检测
    gpio_config_t io_conf = {
        .pin_bit_mask = (1ULL << CHARGING_STATUS_PIN),
        .mode = GPIO_MODE_INPUT,
        .pull_up_en = GPIO_PULLUP_ENABLE,
        .intr_type = GPIO_INTR_DISABLE
    };
    gpio_config(&io_conf);
}

// 获取电池电量百分比
uint8_t get_battery_percentage()
{
    uint32_t voltage_mv = get_battery_voltage_mv();
    
    // 简单线性映射，根据实际电池特性调整
    if (voltage_mv >= 4200) return 100;
    if (voltage_mv <= 3300) return 0;
    
    return (voltage_mv - 3300) * 100 / 900;
}

// 进入低功耗模式
void enter_low_power_mode(power_mode_t mode)
{
    switch (mode) {
        case POWER_MODE_LIGHT_SLEEP:
            // 配置CPU降频
            esp_pm_configure_light_sleep_clock();
            // 启用轻度睡眠
            esp_light_sleep_start();
            break;
            
        case POWER_MODE_DEEP_SLEEP:
            // 配置唤醒源
            esp_sleep_enable_timer_wakeup(DEEP_SLEEP_DURATION_US);
            esp_sleep_enable_ext0_wakeup(WAKEUP_PIN, 0);
            // 进入深度睡眠
            esp_deep_sleep_start();
            break;
    }
}
```

## 数据处理

### 信号处理

- **滤波算法**：
  - 低通滤波器：去除高频噪声
  - 中值滤波器：去除尖刺噪声
  - 卡尔曼滤波器：动态追踪
- **传感器融合**：
  - 六轴融合算法(加速度计+陀螺仪)
  - 姿态估计 (欧拉角, 四元数)
- **运动识别**：
  - 步数检测
  - 活动类型识别 (走路, 跑步, 静止)

```c
// 简化的卡尔曼滤波器实现
typedef struct {
    float q;  // 过程噪声协方差
    float r;  // 测量噪声协方差
    float x;  // 状态估计
    float p;  // 估计误差协方差
    float k;  // 卡尔曼增益
} kalman_filter_t;

void kalman_init(kalman_filter_t *filter, float q, float r, float p, float initial_value)
{
    filter->q = q;
    filter->r = r;
    filter->p = p;
    filter->x = initial_value;
}

float kalman_update(kalman_filter_t *filter, float measurement)
{
    // 预测
    filter->p = filter->p + filter->q;
    
    // 更新
    filter->k = filter->p / (filter->p + filter->r);
    filter->x = filter->x + filter->k * (measurement - filter->x);
    filter->p = (1 - filter->k) * filter->p;
    
    return filter->x;
}
```

### 特征提取

- **时域特征**：
  - 均值, 方差, 峰值
  - 过零率, 信号幅度
  - 峰间间隔
- **频域特征**：
  - FFT变换
  - 频谱能量分布
  - 主频成分

```c
// 计算信号的基本统计特征
void calculate_signal_features(const float *signal, uint32_t length, signal_features_t *features)
{
    float sum = 0.0f;
    float sum_squared = 0.0f;
    float min_val = signal[0];
    float max_val = signal[0];
    
    // 计算基本统计量
    for (uint32_t i = 0; i < length; i++) {
        sum += signal[i];
        sum_squared += signal[i] * signal[i];
        
        if (signal[i] < min_val) min_val = signal[i];
        if (signal[i] > max_val) max_val = signal[i];
    }
    
    // 计算特征
    features->mean = sum / length;
    features->variance = (sum_squared / length) - (features->mean * features->mean);
    features->std_dev = sqrtf(features->variance);
    features->min = min_val;
    features->max = max_val;
    features->range = max_val - min_val;
    
    // 计算过零率
    uint32_t zero_crossings = 0;
    for (uint32_t i = 1; i < length; i++) {
        if ((signal[i-1] < features->mean && signal[i] > features->mean) ||
            (signal[i-1] > features->mean && signal[i] < features->mean)) {
            zero_crossings++;
        }
    }
    features->zero_crossing_rate = (float)zero_crossings / (length - 1);
}
```

## 通信协议

### BLE协议

BodyDFi设备使用蓝牙低功耗(BLE)进行通信，实现以下功能：

- **设备广播**：
  - 广播名称：`BodyDFi-xxxx` (xxxx为设备ID的后4位)
  - 广播数据包含设备类型和基本状态信息
  
- **GATT服务**：

  | 服务名称 | UUID | 描述 |
  |---------|------|------|
  | 设备信息服务 | 0x180A | 标准设备信息服务 |
  | 电池服务 | 0x180F | 标准电池服务 |
  | BodyDFi数据服务 | 0xBDF1 | 自定义数据服务 |
  | BodyDFi控制服务 | 0xBDF2 | 自定义控制服务 |
  
- **特征值**：

  | 服务 | 特征名称 | UUID | 属性 | 描述 |
  |-----|---------|------|------|------|
  | 0x180A | 制造商名称 | 0x2A29 | 读 | "BodyDFi Inc." |
  | 0x180A | 型号 | 0x2A24 | 读 | "BodyDFi Sensor" |
  | 0x180A | 固件版本 | 0x2A26 | 读 | "x.y.z" |
  | 0x180F | 电池电量 | 0x2A19 | 读, 通知 | 0-100% |
  | 0xBDF1 | 传感器数据 | 0xBDF11 | 读, 通知 | 传感器原始数据 |
  | 0xBDF1 | 处理数据 | 0xBDF12 | 读, 通知 | 处理后的数据 |
  | 0xBDF2 | 设备控制 | 0xBDF21 | 读, 写 | 控制命令 |
  | 0xBDF2 | 设备配置 | 0xBDF22 | 读, 写 | 配置参数 |
  | 0xBDF2 | OTA控制 | 0xBDF23 | 读, 写 | OTA更新控制 |

### 数据协议

- **传感器数据格式**：

```json
{
  "timestamp": 1646870400000,
  "acc": [0.12, 9.81, 0.45],
  "gyro": [0.01, 0.02, 0.01],
  "hr": 75,
  "spo2": 98,
  "temp": 36.5,
  "status": 1,
  "battery": 85
}
```

- **命令格式**：

```json
{
  "cmd": "START_COLLECTION",
  "params": {
    "acc_rate": 50,
    "gyro_rate": 50,
    "hr_rate": 10,
    "data_mode": 1
  }
}
```

### 安全机制

- **配对加密**：BLE标准配对和加密
- **数据加密**：AES-128加密关键数据
- **认证**：设备与应用间的相互认证
- **安全启动**：验证固件签名

## 固件更新 (OTA)

- **更新模式**：
  - BLE OTA：通过蓝牙直接更新
  - USB更新：通过USB接口更新
  
- **更新流程**：
  1. 接收新固件
  2. 验证固件签名
  3. 将固件写入备用分区
  4. 验证固件完整性
  5. 更新引导加载程序标志
  6. 重启设备，加载新固件
  
- **故障恢复**：
  - 回滚机制：如果新固件启动失败，回滚到上一版本
  - 引导加载程序保护：防止引导加载程序被损坏

```c
// OTA更新主函数
void start_ota_update()
{
    // 设置OTA配置
    esp_ota_handle_t update_handle = 0;
    const esp_partition_t *update_partition = esp_ota_get_next_update_partition(NULL);
    
    ESP_LOGI(TAG, "Writing to partition subtype %d at offset 0x%x",
             update_partition->subtype, update_partition->address);
    
    // 开始OTA
    ESP_ERROR_CHECK(esp_ota_begin(update_partition, OTA_SIZE_UNKNOWN, &update_handle));
    
    // 接收固件数据并写入
    while (more_data_to_receive) {
        // 通过BLE接收数据块
        int data_len = receive_ota_data(ota_data_buf);
        if (data_len < 0) {
            ESP_LOGE(TAG, "Error receiving OTA data");
            goto ota_end;
        }
        
        // 写入数据到分区
        esp_err_t err = esp_ota_write(update_handle, ota_data_buf, data_len);
        if (err != ESP_OK) {
            ESP_LOGE(TAG, "Error writing OTA data: %s", esp_err_to_name(err));
            goto ota_end;
        }
    }
    
    // 完成OTA并设置引导分区
    esp_err_t err = esp_ota_end(update_handle);
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "OTA end failed: %s", esp_err_to_name(err));
        return;
    }
    
    err = esp_ota_set_boot_partition(update_partition);
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "Set boot partition failed: %s", esp_err_to_name(err));
        return;
    }
    
    ESP_LOGI(TAG, "OTA update complete, restarting...");
    esp_restart();
    
ota_end:
    esp_ota_end(update_handle);
    ESP_LOGE(TAG, "OTA update failed");
}
```

## 电源管理

### 功耗优化

- **睡眠模式**：
  - **活动模式**：~30mA
  - **轻度睡眠**：~5mA
  - **深度睡眠**：~20μA
  
- **策略**：
  - 动态CPU频率调整
  - 传感器间歇采样
  - BLE连接参数优化
  - 关闭未使用外设
  - 事件驱动架构减少轮询

```c
// 配置动态功率管理
void configure_dynamic_power_management()
{
    // 设置CPU频率范围
    esp_pm_config_esp32_t pm_config = {
        .max_freq_mhz = 240,   // 最大频率
        .min_freq_mhz = 80,    // 最小频率
        .light_sleep_enable = true  // 启用轻度睡眠
    };
    ESP_ERROR_CHECK(esp_pm_configure(&pm_config));
    
    // 配置BLE连接参数以优化功耗
    ble_gap_conn_params_t conn_params = {
        .connection_interval_min = 40,  // 50ms
        .connection_interval_max = 80,  // 100ms
        .slave_latency = 4,             // 允许跳过4个连接事件
        .supervision_timeout = 400      // 超时4秒
    };
    ble_gap_update_conn_params(conn_handle, &conn_params);
}

// 基于活动水平的电源管理
void activity_based_power_management(activity_level_t activity)
{
    switch (activity) {
        case ACTIVITY_HIGH:
            // 高活动水平，高性能模式
            esp_pm_lock_acquire(pm_lock);  // 锁定高频率
            sensor_set_sampling_rate(50);  // 50Hz采样率
            break;
            
        case ACTIVITY_MODERATE:
            // 中等活动水平，平衡模式
            esp_pm_lock_release(pm_lock);  // 允许CPU降频
            sensor_set_sampling_rate(25);  // 25Hz采样率
            break;
            
        case ACTIVITY_LOW:
            // 低活动水平，省电模式
            esp_pm_lock_release(pm_lock);  // 允许CPU降频
            sensor_set_sampling_rate(10);  // 10Hz采样率
            break;
            
        case ACTIVITY_IDLE:
            // 静止状态，超低功耗模式
            enter_low_power_mode(POWER_MODE_LIGHT_SLEEP);
            break;
    }
}
```

## 测试框架

### 单元测试

- **模块测试**：
  - 传感器驱动测试
  - 信号处理算法测试
  - BLE协议测试
  
- **集成测试**：
  - 系统启动流程测试
  - 电源管理测试
  - OTA更新测试

```c
// 传感器驱动单元测试
TEST_CASE("MPU6050 Sensor Test", "[mpu6050]")
{
    // 初始化传感器
    TEST_ASSERT_EQUAL(ESP_OK, mpu6050_init(I2C_NUM_0, MPU6050_ADDR));
    
    // 读取设备ID
    uint8_t who_am_i;
    TEST_ASSERT_EQUAL(ESP_OK, mpu6050_read_reg(I2C_NUM_0, MPU6050_ADDR, MPU6050_WHO_AM_I, &who_am_i, 1));
    TEST_ASSERT_EQUAL(0x68, who_am_i);
    
    // 读取传感器数据
    mpu6050_accel_t accel;
    mpu6050_gyro_t gyro;
    TEST_ASSERT_EQUAL(ESP_OK, mpu6050_get_accel(I2C_NUM_0, MPU6050_ADDR, &accel));
    TEST_ASSERT_EQUAL(ESP_OK, mpu6050_get_gyro(I2C_NUM_0, MPU6050_ADDR, &gyro));
    
    // 验证数据在合理范围内
    TEST_ASSERT_FLOAT_WITHIN(20.0f, 0.0f, accel.x);  // 静止时应接近0，但允许一些误差
    TEST_ASSERT_FLOAT_WITHIN(20.0f, 0.0f, accel.y);
    TEST_ASSERT_FLOAT_WITHIN(20.0f, 9.81f, accel.z); // Z轴应接近重力加速度
    
    TEST_ASSERT_FLOAT_WITHIN(5.0f, 0.0f, gyro.x);    // 静止时应接近0
    TEST_ASSERT_FLOAT_WITHIN(5.0f, 0.0f, gyro.y);
    TEST_ASSERT_FLOAT_WITHIN(5.0f, 0.0f, gyro.z);
}
```

### 仿真测试

- **硬件仿真**：
  - 传感器信号仿真
  - 电池电压变化仿真
  
- **环境仿真**：
  - 不同活动场景仿真
  - 干扰和噪声仿真

```c
// 运动模式仿真
void simulate_motion_pattern(motion_pattern_t pattern, float *acc_data, float *gyro_data, uint32_t length)
{
    switch (pattern) {
        case MOTION_WALKING:
            // 模拟步行模式
            for (uint32_t i = 0; i < length; i++) {
                float t = (float)i / 50.0f;  // 假设50Hz采样率
                
                // 垂直方向上的正弦波模拟步行时的上下运动
                acc_data[i*3 + 0] = 0.0f;  // X轴
                acc_data[i*3 + 1] = 0.0f;  // Y轴
                acc_data[i*3 + 2] = 9.81f + 2.0f * sinf(2.0f * PI * 2.0f * t);  // Z轴，~2Hz步频
                
                // 旋转角速度很小
                gyro_data[i*3 + 0] = 0.1f * sinf(2.0f * PI * 2.0f * t);
                gyro_data[i*3 + 1] = 0.1f * cosf(2.0f * PI * 2.0f * t);
                gyro_data[i*3 + 2] = 0.0f;
            }
            break;
            
        case MOTION_RUNNING:
            // 模拟跑步模式，更高频率和幅度
            for (uint32_t i = 0; i < length; i++) {
                float t = (float)i / 50.0f;
                
                acc_data[i*3 + 0] = 1.0f * sinf(2.0f * PI * 3.0f * t);  // X轴
                acc_data[i*3 + 1] = 1.0f * cosf(2.0f * PI * 3.0f * t);  // Y轴
                acc_data[i*3 + 2] = 9.81f + 4.0f * sinf(2.0f * PI * 3.0f * t);  // Z轴，~3Hz步频
                
                gyro_data[i*3 + 0] = 0.5f * sinf(2.0f * PI * 3.0f * t);
                gyro_data[i*3 + 1] = 0.5f * cosf(2.0f * PI * 3.0f * t);
                gyro_data[i*3 + 2] = 0.2f * sinf(2.0f * PI * 1.5f * t);
            }
            break;
            
        // 其他活动模式...
    }
    
    // 添加一些随机噪声
    for (uint32_t i = 0; i < length * 3; i++) {
        acc_data[i] += ((float)rand() / RAND_MAX - 0.5f) * 0.2f;
        gyro_data[i] += ((float)rand() / RAND_MAX - 0.5f) * 0.1f;
    }
}
```

## 固件构建与烧录

### 开发环境

- **工具链**：ESP-IDF v4.4或更高版本
- **编译工具**：CMake, Ninja
- **调试工具**：JTAG调试器, ESP-PROG
- **IDE支持**：VSCode + ESP-IDF插件

### 构建系统

基于ESP-IDF的CMake构建系统：

```cmake
# 最小CMakeLists.txt文件
cmake_minimum_required(VERSION 3.5)

include($ENV{IDF_PATH}/tools/cmake/project.cmake)
project(bodydfi_sensor)

# 添加组件依赖
set(EXTRA_COMPONENT_DIRS 
    ${CMAKE_SOURCE_DIR}/components/mpu6050
    ${CMAKE_SOURCE_DIR}/components/max30101
    ${CMAKE_SOURCE_DIR}/components/data_processing
)
```

### 分区表

```
# Name,   Type, SubType, Offset,  Size, Flags
nvs,      data, nvs,     0x9000,  0x6000,
phy_init, data, phy,     0xf000,  0x1000,
factory,  app,  factory, 0x10000, 1M,
ota_0,    app,  ota_0,   ,        1M,
ota_1,    app,  ota_1,   ,        1M,
storage,  data, spiffs,  ,        0x100000,
```

### 版本控制

- **版本格式**：`major.minor.patch` (如 1.2.3)
- **构建标识**：`buildID` (如 20230315)
- **版本存储**：保存在固件头部和NVS中
- **兼容性检查**：OTA更新时检查版本兼容性

## 固件发布流程

1. **代码审核**：所有更改必须经过代码审核
2. **自动化测试**：运行单元测试和集成测试
3. **手动测试**：在实际硬件上进行功能验证
4. **版本标记**：为通过测试的代码创建版本标签
5. **构建发布包**：生成固件二进制文件
6. **生成文档**：更新版本说明和文档
7. **发布**：将固件发布到OTA服务器
8. **监控**：监控设备升级情况和问题报告

---

*文档版本：1.0*  
*最后更新：2023年3月* 