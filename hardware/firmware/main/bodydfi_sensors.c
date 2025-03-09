/*
 * BodyDFi Sensor 传感器驱动
 * 
 * 实现传感器硬件的初始化和数据读取功能，包括：
 * - MPU-6050 (加速度计+陀螺仪)
 * - MAX30101 (心率传感器)
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_log.h"
#include "esp_err.h"
#include "driver/i2c.h"
#include "driver/gpio.h"

#include "bodydfi_config.h"
#include "bodydfi_sensors.h"

static const char *TAG = "BODYDFI_SENSORS";

/* I2C配置 */
#define I2C_MASTER_SCL_IO       CONFIG_BODYDFI_I2C_SCL_PIN
#define I2C_MASTER_SDA_IO       CONFIG_BODYDFI_I2C_SDA_PIN
#define I2C_MASTER_NUM          I2C_NUM_0
#define I2C_MASTER_FREQ_HZ      400000
#define I2C_MASTER_TIMEOUT_MS   1000

/* MPU-6050寄存器地址 */
#define MPU6050_ADDR            0x68
#define MPU6050_WHO_AM_I        0x75
#define MPU6050_PWR_MGMT_1      0x6B
#define MPU6050_GYRO_CONFIG     0x1B
#define MPU6050_ACCEL_CONFIG    0x1C
#define MPU6050_SMPLRT_DIV      0x19
#define MPU6050_CONFIG          0x1A
#define MPU6050_INT_ENABLE      0x38
#define MPU6050_ACCEL_XOUT_H    0x3B
#define MPU6050_GYRO_XOUT_H     0x43

/* MAX30101寄存器地址 */
#define MAX30101_ADDR           0x57
#define MAX30101_INT_STATUS_1   0x00
#define MAX30101_INT_ENABLE_1   0x02
#define MAX30101_FIFO_WR_PTR    0x04
#define MAX30101_FIFO_RD_PTR    0x06
#define MAX30101_FIFO_DATA      0x07
#define MAX30101_MODE_CONFIG    0x09
#define MAX30101_SPO2_CONFIG    0x0A
#define MAX30101_LED1_PA        0x0C
#define MAX30101_LED2_PA        0x0D
#define MAX30101_PILOT_PA       0x10
#define MAX30101_MULTI_LED      0x11
#define MAX30101_TEMP_INTEGER   0x1F
#define MAX30101_TEMP_FRACTION  0x20
#define MAX30101_REV_ID         0xFE
#define MAX30101_PART_ID        0xFF

/* 传感器状态 */
static bool mpu6050_initialized = false;
static bool max30101_initialized = false;

/* 传感器校准数据 */
static float accel_offset[3] = {0};
static float gyro_offset[3] = {0};

/* I2C通信函数 */
static esp_err_t i2c_master_init(void)
{
    i2c_config_t conf = {
        .mode = I2C_MODE_MASTER,
        .sda_io_num = I2C_MASTER_SDA_IO,
        .sda_pullup_en = GPIO_PULLUP_ENABLE,
        .scl_io_num = I2C_MASTER_SCL_IO,
        .scl_pullup_en = GPIO_PULLUP_ENABLE,
        .master.clk_speed = I2C_MASTER_FREQ_HZ,
    };
    
    esp_err_t ret = i2c_param_config(I2C_MASTER_NUM, &conf);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "I2C parameter configuration failed");
        return ret;
    }
    
    ret = i2c_driver_install(I2C_MASTER_NUM, conf.mode, 0, 0, 0);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "I2C driver installation failed");
        return ret;
    }
    
    ESP_LOGI(TAG, "I2C master initialized");
    return ESP_OK;
}

static esp_err_t i2c_read_bytes(uint8_t dev_addr, uint8_t reg_addr, uint8_t *data, size_t len)
{
    i2c_cmd_handle_t cmd = i2c_cmd_link_create();
    i2c_master_start(cmd);
    i2c_master_write_byte(cmd, (dev_addr << 1) | I2C_MASTER_WRITE, true);
    i2c_master_write_byte(cmd, reg_addr, true);
    i2c_master_start(cmd);
    i2c_master_write_byte(cmd, (dev_addr << 1) | I2C_MASTER_READ, true);
    if (len > 1) {
        i2c_master_read(cmd, data, len - 1, I2C_MASTER_ACK);
    }
    i2c_master_read_byte(cmd, data + len - 1, I2C_MASTER_NACK);
    i2c_master_stop(cmd);
    esp_err_t ret = i2c_master_cmd_begin(I2C_MASTER_NUM, cmd, I2C_MASTER_TIMEOUT_MS / portTICK_PERIOD_MS);
    i2c_cmd_link_delete(cmd);
    return ret;
}

static esp_err_t i2c_write_byte(uint8_t dev_addr, uint8_t reg_addr, uint8_t data)
{
    i2c_cmd_handle_t cmd = i2c_cmd_link_create();
    i2c_master_start(cmd);
    i2c_master_write_byte(cmd, (dev_addr << 1) | I2C_MASTER_WRITE, true);
    i2c_master_write_byte(cmd, reg_addr, true);
    i2c_master_write_byte(cmd, data, true);
    i2c_master_stop(cmd);
    esp_err_t ret = i2c_master_cmd_begin(I2C_MASTER_NUM, cmd, I2C_MASTER_TIMEOUT_MS / portTICK_PERIOD_MS);
    i2c_cmd_link_delete(cmd);
    return ret;
}

/* MPU-6050函数 */
static esp_err_t mpu6050_init_sensor(void)
{
    esp_err_t ret;
    uint8_t data;
    
    /* 检查设备ID */
    ret = i2c_read_bytes(MPU6050_ADDR, MPU6050_WHO_AM_I, &data, 1);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to read MPU6050 WHO_AM_I: %s", esp_err_to_name(ret));
        return ret;
    }
    
    if (data != 0x68) {
        ESP_LOGE(TAG, "MPU6050 WHO_AM_I check failed: expected 0x68, got 0x%02x", data);
        return ESP_FAIL;
    }
    
    ESP_LOGI(TAG, "MPU6050 WHO_AM_I check passed");
    
    /* 唤醒MPU6050，选择陀螺仪时钟 */
    ret = i2c_write_byte(MPU6050_ADDR, MPU6050_PWR_MGMT_1, 0x01);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to wake up MPU6050");
        return ret;
    }
    
    /* 设置采样率分频器 */
    ret = i2c_write_byte(MPU6050_ADDR, MPU6050_SMPLRT_DIV, 0x07); /* 1kHz / (1+7) = 125Hz */
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to set MPU6050 sample rate");
        return ret;
    }
    
    /* 设置陀螺仪配置：±2000°/s */
    ret = i2c_write_byte(MPU6050_ADDR, MPU6050_GYRO_CONFIG, 0x18);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to set MPU6050 gyro config");
        return ret;
    }
    
    /* 设置加速度计配置：±8g */
    ret = i2c_write_byte(MPU6050_ADDR, MPU6050_ACCEL_CONFIG, 0x10);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to set MPU6050 accel config");
        return ret;
    }
    
    /* 设置数字低通滤波器配置 */
    ret = i2c_write_byte(MPU6050_ADDR, MPU6050_CONFIG, 0x03);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to set MPU6050 DLPF config");
        return ret;
    }
    
    /* 设置中断使能：数据就绪中断 */
    ret = i2c_write_byte(MPU6050_ADDR, MPU6050_INT_ENABLE, 0x01);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to set MPU6050 interrupt enable");
        return ret;
    }
    
    ESP_LOGI(TAG, "MPU6050 initialization successful");
    mpu6050_initialized = true;
    return ESP_OK;
}

static esp_err_t mpu6050_read_accel_gyro(int16_t *accel_data, int16_t *gyro_data)
{
    uint8_t buf[14];
    esp_err_t ret = i2c_read_bytes(MPU6050_ADDR, MPU6050_ACCEL_XOUT_H, buf, 14);
    
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to read MPU6050 accel/gyro data: %s", esp_err_to_name(ret));
        return ret;
    }
    
    /* 解析数据 */
    accel_data[0] = (buf[0] << 8) | buf[1];  /* X轴加速度 */
    accel_data[1] = (buf[2] << 8) | buf[3];  /* Y轴加速度 */
    accel_data[2] = (buf[4] << 8) | buf[5];  /* Z轴加速度 */
    
    /* 跳过温度数据（第6和第7字节） */
    
    gyro_data[0] = (buf[8] << 8) | buf[9];   /* X轴角速度 */
    gyro_data[1] = (buf[10] << 8) | buf[11]; /* Y轴角速度 */
    gyro_data[2] = (buf[12] << 8) | buf[13]; /* Z轴角速度 */
    
    return ESP_OK;
}

/* MAX30101函数 */
static esp_err_t max30101_init_sensor(void)
{
    if (!CONFIG_BODYDFI_ENABLE_MAX30101) {
        ESP_LOGW(TAG, "MAX30101 support is disabled in configuration");
        return ESP_OK;
    }
    
    esp_err_t ret;
    uint8_t data;
    
    /* 检查设备ID */
    ret = i2c_read_bytes(MAX30101_ADDR, MAX30101_PART_ID, &data, 1);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to read MAX30101 part ID: %s", esp_err_to_name(ret));
        return ret;
    }
    
    if (data != 0x15) {
        ESP_LOGE(TAG, "MAX30101 part ID check failed: expected 0x15, got 0x%02x", data);
        return ESP_FAIL;
    }
    
    ESP_LOGI(TAG, "MAX30101 part ID check passed");
    
    /* 复位设备 */
    ret = i2c_write_byte(MAX30101_ADDR, MAX30101_MODE_CONFIG, 0x40);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to reset MAX30101");
        return ret;
    }
    
    /* 等待复位完成 */
    vTaskDelay(pdMS_TO_TICKS(100));
    
    /* 设置FIFO配置 */
    ret = i2c_write_byte(MAX30101_ADDR, MAX30101_FIFO_WR_PTR, 0x00);
    if (ret != ESP_OK) return ret;
    
    ret = i2c_write_byte(MAX30101_ADDR, MAX30101_FIFO_RD_PTR, 0x00);
    if (ret != ESP_OK) return ret;
    
    /* 配置工作模式为心率 */
    ret = i2c_write_byte(MAX30101_ADDR, MAX30101_MODE_CONFIG, 0x02); /* 心率模式 */
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to set MAX30101 mode config");
        return ret;
    }
    
    /* 设置SPO2配置 */
    ret = i2c_write_byte(MAX30101_ADDR, MAX30101_SPO2_CONFIG, 0x27);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to set MAX30101 SPO2 config");
        return ret;
    }
    
    /* 设置LED脉冲幅度 */
    ret = i2c_write_byte(MAX30101_ADDR, MAX30101_LED1_PA, 0x24); /* ~4.4mA */
    if (ret != ESP_OK) return ret;
    
    ret = i2c_write_byte(MAX30101_ADDR, MAX30101_LED2_PA, 0x24); /* ~4.4mA */
    if (ret != ESP_OK) return ret;
    
    /* 启用中断 */
    ret = i2c_write_byte(MAX30101_ADDR, MAX30101_INT_ENABLE_1, 0x80); /* 数据就绪中断 */
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to set MAX30101 interrupt enable");
        return ret;
    }
    
    ESP_LOGI(TAG, "MAX30101 initialization successful");
    max30101_initialized = true;
    return ESP_OK;
}

static esp_err_t max30101_read_hr_data(uint32_t *red_led, uint32_t *ir_led)
{
    if (!max30101_initialized) {
        return ESP_ERR_INVALID_STATE;
    }
    
    uint8_t buf[6];
    esp_err_t ret = i2c_read_bytes(MAX30101_ADDR, MAX30101_FIFO_DATA, buf, 6);
    
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to read MAX30101 FIFO data: %s", esp_err_to_name(ret));
        return ret;
    }
    
    /* 解析数据 - 每个LED读数占3个字节 */
    *red_led = ((uint32_t)buf[0] << 16) | ((uint32_t)buf[1] << 8) | buf[2];
    *ir_led = ((uint32_t)buf[3] << 16) | ((uint32_t)buf[4] << 8) | buf[5];
    
    /* 只保留最低18位 */
    *red_led &= 0x3FFFF;
    *ir_led &= 0x3FFFF;
    
    return ESP_OK;
}

/* 传感器校准函数 */
static esp_err_t sensors_calibrate(void)
{
    if (!mpu6050_initialized) {
        return ESP_ERR_INVALID_STATE;
    }
    
    ESP_LOGI(TAG, "Starting sensor calibration...");
    
    const int num_samples = 100;
    float accel_sum[3] = {0};
    float gyro_sum[3] = {0};
    
    /* 收集多个样本以计算偏移量 */
    for (int i = 0; i < num_samples; i++) {
        int16_t accel_raw[3];
        int16_t gyro_raw[3];
        
        esp_err_t ret = mpu6050_read_accel_gyro(accel_raw, gyro_raw);
        if (ret != ESP_OK) {
            ESP_LOGE(TAG, "Calibration failed: unable to read sensor data");
            return ret;
        }
        
        /* 累加原始读数 */
        for (int j = 0; j < 3; j++) {
            accel_sum[j] += accel_raw[j];
            gyro_sum[j] += gyro_raw[j];
        }
        
        vTaskDelay(pdMS_TO_TICKS(10));
    }
    
    /* 计算平均值作为偏移量 */
    for (int i = 0; i < 3; i++) {
        accel_offset[i] = accel_sum[i] / num_samples;
        gyro_offset[i] = gyro_sum[i] / num_samples;
    }
    
    /* 对于加速度计，假设Z轴指向地面，该轴应该读取约+1g */
    accel_offset[2] -= 16384; /* 在±8g范围内，1g约为16384 */
    
    ESP_LOGI(TAG, "Calibration complete");
    ESP_LOGI(TAG, "Accel offsets: X=%.2f, Y=%.2f, Z=%.2f", accel_offset[0], accel_offset[1], accel_offset[2]);
    ESP_LOGI(TAG, "Gyro offsets: X=%.2f, Y=%.2f, Z=%.2f", gyro_offset[0], gyro_offset[1], gyro_offset[2]);
    
    return ESP_OK;
}

/* 公共API函数 */
esp_err_t sensors_init(void)
{
    ESP_LOGI(TAG, "Initializing sensors...");
    
    /* 初始化I2C总线 */
    esp_err_t ret = i2c_master_init();
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "I2C master initialization failed: %s", esp_err_to_name(ret));
        return ret;
    }
    
    /* 初始化MPU-6050 */
    ret = mpu6050_init_sensor();
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "MPU6050 initialization failed: %s", esp_err_to_name(ret));
        return ret;
    }
    
    /* 初始化MAX30101 (可选) */
    if (CONFIG_BODYDFI_ENABLE_MAX30101) {
        ret = max30101_init_sensor();
        if (ret != ESP_OK) {
            ESP_LOGW(TAG, "MAX30101 initialization failed: %s", esp_err_to_name(ret));
            /* 继续，因为这是可选功能 */
        }
    }
    
    /* 校准传感器 */
    if (CONFIG_BODYDFI_ENABLE_CALIBRATION) {
        ret = sensors_calibrate();
        if (ret != ESP_OK) {
            ESP_LOGW(TAG, "Sensor calibration failed: %s", esp_err_to_name(ret));
            /* 继续，即使校准失败 */
        }
    }
    
    ESP_LOGI(TAG, "Sensors initialization complete");
    return ESP_OK;
}

esp_err_t sensors_read(sensor_data_t *data)
{
    if (data == NULL) {
        return ESP_ERR_INVALID_ARG;
    }
    
    if (!mpu6050_initialized) {
        return ESP_ERR_INVALID_STATE;
    }
    
    /* 获取当前时间戳 */
    data->timestamp = esp_timer_get_time();
    
    /* 读取MPU-6050数据 */
    int16_t accel_raw[3];
    int16_t gyro_raw[3];
    
    esp_err_t ret = mpu6050_read_accel_gyro(accel_raw, gyro_raw);
    if (ret != ESP_OK) {
        ESP_LOGW(TAG, "Failed to read MPU6050 data: %s", esp_err_to_name(ret));
        return ret;
    }
    
    /* 将原始数据转换为实际单位并应用校准偏移 */
    for (int i = 0; i < 3; i++) {
        /* 加速度：在±8g量程下，16384 LSB/g */
        data->accel[i] = (accel_raw[i] - accel_offset[i]) / 16384.0f;
        
        /* 陀螺仪：在±2000°/s量程下，16.4 LSB/(°/s) */
        data->gyro[i] = (gyro_raw[i] - gyro_offset[i]) / 16.4f;
    }
    
    /* 读取MAX30101数据（如果可用） */
    if (max30101_initialized) {
        uint32_t red_led, ir_led;
        ret = max30101_read_hr_data(&red_led, &ir_led);
        
        if (ret == ESP_OK) {
            data->heart_rate_data.red_led = red_led;
            data->heart_rate_data.ir_led = ir_led;
            data->heart_rate_data.valid = true;
        } else {
            data->heart_rate_data.valid = false;
        }
    } else {
        data->heart_rate_data.valid = false;
    }
    
    return ESP_OK;
}

esp_err_t process_sensor_data(const sensor_data_t *raw_data, processed_data_t *processed_data)
{
    if (raw_data == NULL || processed_data == NULL) {
        return ESP_ERR_INVALID_ARG;
    }
    
    /* 复制时间戳 */
    processed_data->timestamp = raw_data->timestamp;
    
    /* 应用低通滤波 */
    static float accel_filtered[3] = {0};
    static float gyro_filtered[3] = {0};
    
    const float alpha = 0.2f; /* 滤波系数 */
    
    for (int i = 0; i < 3; i++) {
        accel_filtered[i] = alpha * raw_data->accel[i] + (1.0f - alpha) * accel_filtered[i];
        gyro_filtered[i] = alpha * raw_data->gyro[i] + (1.0f - alpha) * gyro_filtered[i];
        
        processed_data->accel[i] = accel_filtered[i];
        processed_data->gyro[i] = gyro_filtered[i];
    }
    
    /* 计算合成加速度的大小 */
    float accel_magnitude = sqrtf(
        processed_data->accel[0] * processed_data->accel[0] +
        processed_data->accel[1] * processed_data->accel[1] +
        processed_data->accel[2] * processed_data->accel[2]
    );
    
    processed_data->accel_magnitude = accel_magnitude;
    
    /* 计算活动水平 */
    static float activity_level = 0.0f;
    static float accel_magnitude_prev = 0.0f;
    
    float magnitude_delta = fabsf(accel_magnitude - accel_magnitude_prev);
    accel_magnitude_prev = accel_magnitude;
    
    /* 使用平滑活动水平 */
    activity_level = 0.9f * activity_level + 0.1f * magnitude_delta * 10.0f;
    processed_data->activity_level = activity_level;
    
    /* 处理心率数据（如果有效） */
    if (raw_data->heart_rate_data.valid) {
        /* 此处应实现心率算法，这里只提供一个简化版本 */
        static uint32_t prev_ir_led = 0;
        static uint32_t heart_rate = 0;
        static int peak_count = 0;
        static int64_t last_peak_time = 0;
        
        uint32_t ir_led = raw_data->heart_rate_data.ir_led;
        
        /* 简单的峰值检测 */
        if (ir_led < prev_ir_led && prev_ir_led > 0) {
            int64_t current_time = raw_data->timestamp;
            
            if (last_peak_time > 0 && peak_count < 5) {
                /* 计算心率: 60 * 1000000 / (微秒间隔) = 每分钟心跳数 */
                int64_t interval = current_time - last_peak_time;
                if (interval > 0) {
                    uint32_t new_heart_rate = (uint32_t)(60 * 1000000 / interval);
                    /* 合理的心率范围检查 */
                    if (new_heart_rate >= 40 && new_heart_rate <= 200) {
                        /* 平滑心率值 */
                        heart_rate = (heart_rate * 3 + new_heart_rate) / 4;
                        peak_count++;
                    }
                }
            }
            
            last_peak_time = current_time;
        }
        
        prev_ir_led = ir_led;
        processed_data->heart_rate = heart_rate;
        processed_data->heart_rate_valid = (peak_count >= 3);
    } else {
        processed_data->heart_rate_valid = false;
    }
    
    return ESP_OK;
} 