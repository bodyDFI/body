/*
 * BodyDFi Sensor 传感器驱动头文件
 */

#ifndef BODYDFI_SENSORS_H
#define BODYDFI_SENSORS_H

#include "esp_err.h"
#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

/**
 * 心率传感器原始数据结构
 */
typedef struct {
    uint32_t red_led;  /**< 红光LED读数 */
    uint32_t ir_led;   /**< 红外LED读数 */
    bool valid;        /**< 数据有效标志 */
} heart_rate_data_t;

/**
 * 传感器原始数据结构
 */
typedef struct {
    int64_t timestamp;          /**< 时间戳 (微秒) */
    float accel[3];             /**< 加速度 [x, y, z] (g) */
    float gyro[3];              /**< 角速度 [x, y, z] (度/秒) */
    heart_rate_data_t heart_rate_data; /**< 心率传感器数据 */
} sensor_data_t;

/**
 * 处理后的传感器数据结构
 */
typedef struct {
    int64_t timestamp;          /**< 时间戳 (微秒) */
    float accel[3];             /**< 滤波后的加速度 [x, y, z] (g) */
    float gyro[3];              /**< 滤波后的角速度 [x, y, z] (度/秒) */
    float accel_magnitude;      /**< 加速度大小 (g) */
    float activity_level;       /**< 活动水平 (0-10) */
    uint32_t heart_rate;        /**< 计算的心率 (BPM) */
    bool heart_rate_valid;      /**< 心率有效标志 */
} processed_data_t;

/**
 * @brief 初始化传感器
 * 
 * 初始化I2C总线和连接的传感器（MPU-6050和MAX30101）
 * 
 * @return 
 *     - ESP_OK: 成功
 *     - 其他: 失败
 */
esp_err_t sensors_init(void);

/**
 * @brief 读取传感器数据
 * 
 * 从传感器读取原始数据并转换为物理单位
 * 
 * @param[out] data 指向传感器数据结构的指针
 * @return 
 *     - ESP_OK: 成功
 *     - ESP_ERR_INVALID_ARG: 参数无效
 *     - ESP_ERR_INVALID_STATE: 传感器未初始化
 *     - 其他: 读取失败
 */
esp_err_t sensors_read(sensor_data_t *data);

/**
 * @brief 处理传感器数据
 * 
 * 对原始传感器数据进行处理，应用滤波算法，计算特征
 * 
 * @param[in] raw_data 指向原始传感器数据的指针
 * @param[out] processed_data 指向处理后数据结构的指针
 * @return 
 *     - ESP_OK: 成功
 *     - ESP_ERR_INVALID_ARG: 参数无效
 *     - 其他: 处理失败
 */
esp_err_t process_sensor_data(const sensor_data_t *raw_data, processed_data_t *processed_data);

#ifdef __cplusplus
}
#endif

#endif /* BODYDFI_SENSORS_H */ 