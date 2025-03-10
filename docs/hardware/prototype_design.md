# BodyDFi Sensor 原型设计文档

## 设计概述

本文档提供了BodyDFi Sensor基础版本的原型设计指南。该原型旨在验证核心功能，并为后续量产版本提供基础。

## 硬件架构

![BodyDFi Sensor硬件架构](../diagrams/hardware_architecture.svg)

### 核心组件

1. **主控制器**：ESP32-PICO-D4
   - 双核Tensilica LX6微处理器
   - 520 KB SRAM
   - 集成Wi-Fi和蓝牙/BLE
   - 支持SPI, I2C, UART等多种接口

2. **传感器**：
   - **MPU-6050**：6轴运动追踪模块（3轴加速度计+3轴陀螺仪）
   - **MAX30101**：血氧/心率光电传感器（可选配置）

3. **电源管理**：
   - **TP4056**：锂电池充电管理
   - **TPS63020**：高效DC-DC转换器
   - **120mAh锂聚合物电池**

4. **接口**：
   - **USB Type-C**：充电和编程接口
   - **磁性连接器**：可穿戴配件接口

5. **指示器**：
   - 状态LED（RGB）
   - 充电指示LED

## 电路设计

### 电源电路

```
USB Type-C → TP4056充电IC → 电池 → TPS63020 → 3.3V系统电源
```

设计考虑：
- 低待机电流（<10μA）
- 高效率电源转换（>90%）
- 电池保护电路（过充、过放、短路保护）
- 运行时30mA平均电流消耗

### 传感器接口

MPU-6050连接到ESP32的I2C总线：
- SDA: GPIO21
- SCL: GPIO22
- INT: GPIO23（中断信号）

MAX30101（可选）连接到第二组I2C总线：
- SDA: GPIO25
- SCL: GPIO26
- INT: GPIO27（中断信号）

### 原理图

![原型原理图](../diagrams/schematic_preview.svg)

完整原理图可在项目工程文件中找到（`/hardware/schematics/bodydfi_sensor_v1.pdf`）。

## PCB设计

### 设计规范

- 层数：4层
- 尺寸：20mm x 30mm
- 最小走线宽度：6mil
- 最小走线间距：6mil
- 最小过孔直径：0.3mm
- 过孔埋盖：小信号层进行埋盖以减小尺寸

### 层叠结构

1. 顶层：信号层和元件焊盘
2. 内层1：接地平面
3. 内层2：电源平面（3.3V, VBAT）
4. 底层：信号层和元件焊盘

### 设计注意事项

- 天线区域：PCB顶部边缘预留ESP32天线区域，无地平面
- 高速信号：I2C和SPI走线需控制阻抗和长度
- 传感器放置：MPU-6050放置在PCB中心以获取最佳测量效果
- 电源隔离：模拟和数字电源分区，减少干扰

### PCB布局预览

![PCB布局预览](../diagrams/pcb_layout_preview.svg)

完整PCB设计文件可在项目工程文件中找到（`/hardware/pcb/bodydfi_sensor_v1.kicad_pcb`）。

## 外壳设计

### 外壳规格

- 尺寸：30mm × 20mm × 10mm
- 材质：PC/ABS混合塑料
- 防水等级：IP67
- 颜色选项：黑色、白色、绿色（BodyDFi品牌色）

### 结构组成

1. **顶壳**：带透明窗口显示状态LED
2. **底壳**：带充电触点和传感器窗口
3. **硅胶垫圈**：确保防水密封
4. **腕带/夹子接口**：磁性连接点

### 3D模型预览

![外壳3D模型](../diagrams/enclosure_3d_preview.svg)

完整3D设计文件可在项目工程文件中找到（`/hardware/mechanical/bodydfi_sensor_v1.step`）。

## 固件架构

### 软件栈

1. **引导加载程序**：标准ESP-IDF引导加载程序
2. **操作系统**：FreeRTOS
3. **驱动层**：
   - ESP32 HAL驱动
   - MPU-6050驱动
   - MAX30101驱动（可选）
   - 电源管理驱动
4. **中间件**：
   - BLE协议栈
   - 数据处理库
   - 加密库
5. **应用层**：
   - 设备控制
   - 数据采集
   - 电源管理
   - 蓝牙通信

### 主要任务

1. **传感器任务**：定时读取传感器数据，50Hz采样率
2. **数据处理任务**：滤波、校准和特征提取
3. **通信任务**：BLE广播和连接管理
4. **电源管理任务**：监控电池状态并管理低功耗模式

### 状态机

![固件状态机](../diagrams/firmware_state_machine.svg)

主要状态：
- **初始化**：设备启动和自检
- **待机**：低功耗等待连接
- **配对**：与移动设备建立连接
- **活动**：数据采集和传输
- **休眠**：深度低功耗状态

## 原型制造指南

### 物料清单(BOM)

| 类别 | 组件 | 型号 | 数量 | 参考价格 |
|-----|-----|-----|-----|-----|
| 主控制器 | SoC | ESP32-PICO-D4 | 1 | $4.50 |
| 传感器 | 6轴IMU | MPU-6050 | 1 | $1.20 |
| 传感器 | 心率/血氧 | MAX30101 | 1 | $2.80 |
| 电源管理 | 电池充电 | TP4056 | 1 | $0.35 |
| 电源管理 | DC-DC转换 | TPS63020 | 1 | $1.60 |
| 无源元件 | 电阻 | 各种规格 | 25 | $0.50 |
| 无源元件 | 电容 | 各种规格 | 20 | $0.60 |
| 无源元件 | 电感 | 各种规格 | 3 | $0.45 |
| 接口 | USB接口 | Type-C | 1 | $0.40 |
| 电源 | 锂电池 | 120mAh | 1 | $3.20 |
| PCB | 4层PCB | 20mm×30mm | 1 | $2.50 |
| 结构 | 塑料外壳 | 定制 | 1 | $3.00 |
| 附件 | 硅胶腕带 | 定制 | 1 | $1.50 |
| **总计** | | | | **$22.60** |

完整BOM可在项目工程文件中找到（`/hardware/docs/bodydfi_sensor_v1_bom.xlsx`）。

### 制造流程

1. **PCB制造**：
   - 提供Gerber文件给PCB制造商
   - 建议使用4层板工艺
   - 要求ENIG表面处理
   
2. **元件采购**：
   - 核心组件从授权分销商采购
   - 无源元件可从一般电子元件供应商采购
   
3. **PCB组装**：
   - 使用SMT工艺组装
   - 关键组件如ESP32芯片需要注意热管理
   
4. **外壳制造**：
   - 初期可用3D打印技术制作原型
   - 小批量可使用CNC加工
   - 量产使用注塑工艺
   
5. **装配测试**：
   - PCB组装后进行通电测试
   - 烧录基础测试固件
   - 装入外壳前进行传感器校准
   - 完成装配后进行功能和防水测试

## 测试方案

### 硬件测试

1. **上电测试**：检查电源轨电压和电流消耗
2. **功能测试**：验证所有组件正常工作
3. **传感器校准**：校准加速度计和陀螺仪
4. **电池测试**：验证充电时间和放电曲线
5. **防水测试**：按IP67标准进行防水测试

### 软件测试

1. **固件烧录**：验证固件能正确烧录
2. **自检程序**：运行内置自检程序
3. **传感器数据**：验证传感器数据准确性
4. **BLE连接**：测试BLE连接和数据传输
5. **功耗测试**：测量各状态下的功耗
6. **长时间测试**：进行24小时连续运行测试

## 认证规划

计划进行的认证测试：

1. **安全认证**：
   - CE标志（欧洲）
   - FCC认证（美国）
   - RoHS合规（有害物质限制）
   
2. **无线认证**：
   - 蓝牙SIG认证
   - Wi-Fi联盟认证（如适用）
   
3. **防水认证**：
   - IP67测试
   
4. **电池安全**：
   - IEC 62133锂电池安全标准

## 成本估算

### 原型成本（10件）

- 材料成本：$22.60/件
- PCB制造：$150总计
- 组装成本：$200总计
- 外壳制作：$300总计
- 测试成本：$200总计
- **总计**：$950，约$95/件

### 小批量成本（100件）

- 材料成本：$18.00/件（批量折扣）
- PCB制造：$300总计
- 组装成本：$500总计
- 外壳制作：$800总计
- 测试成本：$400总计
- **总计**：$3,800，约$38/件

### 量产成本（10,000件）

- 材料成本：$12.00/件（批量折扣）
- 制造成本：$5.00/件
- 质量控制：$1.00/件
- 包装成本：$0.50/件
- **总计**：约$18.50/件

## 后续计划

1. **原型验证**：制造5-10个原型样机进行功能验证
2. **用户测试**：邀请小规模用户进行实际使用测试
3. **设计优化**：根据测试反馈优化设计
4. **小批量生产**：生产约100个设备进行市场测试
5. **量产准备**：完善量产工艺和供应链管理

---

*文档版本：1.0*  
*最后更新：2023年3月* 