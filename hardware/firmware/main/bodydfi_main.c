/* 
 * BodyDFi Sensor 固件主程序
 * 
 * 实现ESP32主控制逻辑，包括：
 * - 系统初始化
 * - 传感器管理
 * - BLE通信
 * - 电源管理
 * - 任务调度
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/queue.h"
#include "freertos/event_groups.h"
#include "esp_system.h"
#include "esp_log.h"
#include "nvs_flash.h"
#include "esp_bt.h"
#include "esp_gap_ble_api.h"
#include "esp_gatts_api.h"
#include "esp_bt_defs.h"
#include "esp_bt_main.h"
#include "esp_gatt_common_api.h"

#include "bodydfi_config.h"
#include "bodydfi_sensors.h"
#include "bodydfi_ble.h"
#include "bodydfi_power.h"
#include "bodydfi_storage.h"

static const char *TAG = "BODYDFI_MAIN";

/* FreeRTOS事件组，用于任务同步 */
EventGroupHandle_t bodydfi_event_group;
#define SENSOR_INIT_DONE_BIT BIT0
#define BLE_INIT_DONE_BIT    BIT1
#define POWER_INIT_DONE_BIT  BIT2
#define STORAGE_INIT_DONE_BIT BIT3
#define ALL_INIT_DONE_BITS (SENSOR_INIT_DONE_BIT | BLE_INIT_DONE_BIT | POWER_INIT_DONE_BIT | STORAGE_INIT_DONE_BIT)

/* 系统状态机状态 */
typedef enum {
    BODYDFI_STATE_INIT,
    BODYDFI_STATE_IDLE,
    BODYDFI_STATE_SCANNING,
    BODYDFI_STATE_PAIRING,
    BODYDFI_STATE_CONNECTED,
    BODYDFI_STATE_ACTIVE,
    BODYDFI_STATE_OTA_UPDATE,
    BODYDFI_STATE_ERROR
} bodydfi_state_t;

static bodydfi_state_t current_state = BODYDFI_STATE_INIT;

/* 任务句柄 */
TaskHandle_t main_task_handle;
TaskHandle_t sensor_task_handle;
TaskHandle_t processing_task_handle;
TaskHandle_t ble_task_handle;
TaskHandle_t storage_task_handle;
TaskHandle_t power_mgmt_task_handle;
TaskHandle_t watchdog_task_handle;

/* 队列句柄，用于传递传感器数据 */
QueueHandle_t sensor_data_queue;
QueueHandle_t processed_data_queue;

/* 传感器任务 */
void sensor_task(void *pvParameters)
{
    ESP_LOGI(TAG, "Sensor task started");
    sensor_data_t sensor_data;
    
    /* 等待传感器初始化完成 */
    xEventGroupWaitBits(bodydfi_event_group, SENSOR_INIT_DONE_BIT, pdFALSE, pdTRUE, portMAX_DELAY);
    
    while (1) {
        /* 读取传感器数据 */
        if (sensors_read(&sensor_data) == ESP_OK) {
            /* 将数据发送到处理队列 */
            if (xQueueSend(sensor_data_queue, &sensor_data, pdMS_TO_TICKS(10)) != pdPASS) {
                ESP_LOGW(TAG, "Sensor queue full");
            }
        }
        
        /* 根据当前采样率调整延时 */
        uint32_t sampling_period_ms = 1000 / CONFIG_BODYDFI_SAMPLING_RATE;
        vTaskDelay(pdMS_TO_TICKS(sampling_period_ms));
    }
}

/* 数据处理任务 */
void processing_task(void *pvParameters)
{
    ESP_LOGI(TAG, "Processing task started");
    sensor_data_t raw_data;
    processed_data_t processed_data;
    
    /* 等待所有初始化完成 */
    xEventGroupWaitBits(bodydfi_event_group, ALL_INIT_DONE_BITS, pdFALSE, pdTRUE, portMAX_DELAY);
    
    while (1) {
        /* 从传感器队列获取数据 */
        if (xQueueReceive(sensor_data_queue, &raw_data, pdMS_TO_TICKS(100)) == pdPASS) {
            /* 处理数据 */
            process_sensor_data(&raw_data, &processed_data);
            
            /* 将处理后的数据发送到BLE队列 */
            if (xQueueSend(processed_data_queue, &processed_data, pdMS_TO_TICKS(10)) != pdPASS) {
                ESP_LOGW(TAG, "Processed data queue full");
            }
            
            /* 存储数据（如果启用） */
            if (CONFIG_BODYDFI_ENABLE_LOCAL_STORAGE) {
                storage_save_data(&processed_data);
            }
        }
    }
}

/* BLE任务 */
void ble_task(void *pvParameters)
{
    ESP_LOGI(TAG, "BLE task started");
    processed_data_t data_to_send;
    
    /* 等待BLE初始化完成 */
    xEventGroupWaitBits(bodydfi_event_group, BLE_INIT_DONE_BIT, pdFALSE, pdTRUE, portMAX_DELAY);
    
    while (1) {
        /* 检查是否处于连接状态 */
        if (current_state == BODYDFI_STATE_CONNECTED || current_state == BODYDFI_STATE_ACTIVE) {
            /* 从处理队列获取数据 */
            if (xQueueReceive(processed_data_queue, &data_to_send, pdMS_TO_TICKS(100)) == pdPASS) {
                /* 通过BLE发送数据 */
                ble_send_sensor_data(&data_to_send);
            }
        }
        
        /* 处理BLE事件 */
        ble_process_events();
        
        vTaskDelay(pdMS_TO_TICKS(10));
    }
}

/* 电源管理任务 */
void power_mgmt_task(void *pvParameters)
{
    ESP_LOGI(TAG, "Power management task started");
    
    /* 等待电源管理初始化完成 */
    xEventGroupWaitBits(bodydfi_event_group, POWER_INIT_DONE_BIT, pdFALSE, pdTRUE, portMAX_DELAY);
    
    while (1) {
        /* 监控电池电量 */
        uint8_t battery_percentage = power_get_battery_level();
        ESP_LOGD(TAG, "Battery level: %d%%", battery_percentage);
        
        /* 根据当前活动水平调整功耗 */
        activity_level_t activity = power_get_activity_level();
        power_adjust_for_activity(activity);
        
        /* 检查是否需要进入低功耗模式 */
        if (current_state == BODYDFI_STATE_IDLE && battery_percentage < CONFIG_BODYDFI_LOW_BATTERY_THRESHOLD) {
            ESP_LOGI(TAG, "Low battery, entering power saving mode");
            power_enter_low_power_mode();
        }
        
        vTaskDelay(pdMS_TO_TICKS(1000)); /* 每秒检查一次 */
    }
}

/* 存储任务 */
void storage_task(void *pvParameters)
{
    ESP_LOGI(TAG, "Storage task started");
    
    /* 等待存储初始化完成 */
    xEventGroupWaitBits(bodydfi_event_group, STORAGE_INIT_DONE_BIT, pdFALSE, pdTRUE, portMAX_DELAY);
    
    while (1) {
        /* 周期性执行存储维护任务 */
        storage_perform_maintenance();
        
        /* 较长周期任务，不需要频繁执行 */
        vTaskDelay(pdMS_TO_TICKS(10000)); /* 10秒执行一次 */
    }
}

/* 看门狗任务 */
void watchdog_task(void *pvParameters)
{
    ESP_LOGI(TAG, "Watchdog task started");
    
    while (1) {
        /* 检查各个任务的健康状态 */
        bool system_healthy = true;
        
        /* 检查传感器任务 */
        if (eTaskGetState(sensor_task_handle) == eDeleted || 
            eTaskGetState(sensor_task_handle) == eSuspended) {
            ESP_LOGE(TAG, "Sensor task is not running");
            system_healthy = false;
        }
        
        /* 检查其他关键任务... */
        
        /* 如果系统不健康，尝试恢复或重启 */
        if (!system_healthy) {
            if (current_state != BODYDFI_STATE_ERROR) {
                ESP_LOGE(TAG, "System unhealthy, entering error state");
                current_state = BODYDFI_STATE_ERROR;
                /* 可以尝试恢复操作，如重启任务 */
            }
        }
        
        vTaskDelay(pdMS_TO_TICKS(5000)); /* 5秒检查一次 */
    }
}

/* 状态处理函数 */
void handle_state(bodydfi_state_t state)
{
    static bodydfi_state_t prev_state = BODYDFI_STATE_INIT;
    
    /* 状态变化时输出日志 */
    if (state != prev_state) {
        ESP_LOGI(TAG, "State changed: %d -> %d", prev_state, state);
        prev_state = state;
    }
    
    switch (state) {
        case BODYDFI_STATE_INIT:
            /* 初始化状态的处理 */
            break;
            
        case BODYDFI_STATE_IDLE:
            /* 空闲状态的处理 */
            break;
            
        case BODYDFI_STATE_SCANNING:
            /* 扫描状态的处理 */
            break;
            
        case BODYDFI_STATE_PAIRING:
            /* 配对状态的处理 */
            break;
            
        case BODYDFI_STATE_CONNECTED:
            /* 已连接状态的处理 */
            break;
            
        case BODYDFI_STATE_ACTIVE:
            /* 活动状态的处理 */
            break;
            
        case BODYDFI_STATE_OTA_UPDATE:
            /* OTA更新状态的处理 */
            break;
            
        case BODYDFI_STATE_ERROR:
            /* 错误状态的处理 */
            ESP_LOGE(TAG, "System in ERROR state, attempting recovery");
            /* 尝试恢复操作 */
            break;
            
        default:
            ESP_LOGE(TAG, "Unknown state: %d", state);
            break;
    }
}

/* 系统初始化 */
void init_system(void)
{
    esp_err_t ret;
    
    /* 初始化NVS */
    ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_LOGW(TAG, "NVS needs to be erased");
        ESP_ERROR_CHECK(nvs_flash_erase());
        ret = nvs_flash_init();
    }
    ESP_ERROR_CHECK(ret);
    ESP_LOGI(TAG, "NVS initialized");
    
    /* 创建事件组 */
    bodydfi_event_group = xEventGroupCreate();
    
    /* 创建队列 */
    sensor_data_queue = xQueueCreate(10, sizeof(sensor_data_t));
    processed_data_queue = xQueueCreate(10, sizeof(processed_data_t));
    
    /* 初始化传感器 */
    ret = sensors_init();
    if (ret == ESP_OK) {
        ESP_LOGI(TAG, "Sensors initialized");
        xEventGroupSetBits(bodydfi_event_group, SENSOR_INIT_DONE_BIT);
    } else {
        ESP_LOGE(TAG, "Sensor init failed: %s", esp_err_to_name(ret));
    }
    
    /* 初始化BLE */
    ret = ble_init();
    if (ret == ESP_OK) {
        ESP_LOGI(TAG, "BLE initialized");
        xEventGroupSetBits(bodydfi_event_group, BLE_INIT_DONE_BIT);
    } else {
        ESP_LOGE(TAG, "BLE init failed: %s", esp_err_to_name(ret));
    }
    
    /* 初始化电源管理 */
    ret = power_init();
    if (ret == ESP_OK) {
        ESP_LOGI(TAG, "Power management initialized");
        xEventGroupSetBits(bodydfi_event_group, POWER_INIT_DONE_BIT);
    } else {
        ESP_LOGE(TAG, "Power init failed: %s", esp_err_to_name(ret));
    }
    
    /* 初始化存储 */
    ret = storage_init();
    if (ret == ESP_OK) {
        ESP_LOGI(TAG, "Storage initialized");
        xEventGroupSetBits(bodydfi_event_group, STORAGE_INIT_DONE_BIT);
    } else {
        ESP_LOGE(TAG, "Storage init failed: %s", esp_err_to_name(ret));
    }
}

/* 创建系统任务 */
void create_tasks(void)
{
    /* 创建传感器任务 */
    xTaskCreatePinnedToCore(sensor_task, "sensor_task", 2048, NULL, 4, &sensor_task_handle, 0);
    
    /* 创建数据处理任务 */
    xTaskCreatePinnedToCore(processing_task, "processing_task", 4096, NULL, 3, &processing_task_handle, 0);
    
    /* 创建BLE任务 */
    xTaskCreatePinnedToCore(ble_task, "ble_task", 4096, NULL, 4, &ble_task_handle, 0);
    
    /* 创建电源管理任务 */
    xTaskCreatePinnedToCore(power_mgmt_task, "power_task", 1024, NULL, 5, &power_mgmt_task_handle, 1);
    
    /* 创建存储任务 */
    xTaskCreatePinnedToCore(storage_task, "storage_task", 2048, NULL, 2, &storage_task_handle, 1);
    
    /* 创建看门狗任务 */
    xTaskCreatePinnedToCore(watchdog_task, "watchdog_task", 1024, NULL, 6, &watchdog_task_handle, 1);
}

/* 主任务 */
void main_task(void *pvParameters)
{
    ESP_LOGI(TAG, "Main task started");
    
    /* 初始化系统 */
    init_system();
    
    /* 创建其他任务 */
    create_tasks();
    
    /* 切换到IDLE状态 */
    current_state = BODYDFI_STATE_IDLE;
    
    /* 主循环 */
    while (1) {
        /* 处理当前状态 */
        handle_state(current_state);
        
        /* 检查是否需要状态转换 */
        // 根据事件和条件判断是否需要切换状态
        // 例如，如果检测到BLE连接，切换到CONNECTED状态
        
        vTaskDelay(pdMS_TO_TICKS(100)); /* 主循环每100ms执行一次 */
    }
}

/* 应用入口点 */
void app_main(void)
{
    ESP_LOGI(TAG, "BodyDFi Sensor firmware starting");
    ESP_LOGI(TAG, "Version: %s", CONFIG_BODYDFI_FIRMWARE_VERSION);
    
    /* 打印系统信息 */
    esp_chip_info_t chip_info;
    esp_chip_info(&chip_info);
    ESP_LOGI(TAG, "ESP32 chip with %d CPU cores, WiFi%s%s, silicon revision %d",
             chip_info.cores,
             (chip_info.features & CHIP_FEATURE_BT) ? "/BT" : "",
             (chip_info.features & CHIP_FEATURE_BLE) ? "/BLE" : "",
             chip_info.revision);
    ESP_LOGI(TAG, "Free heap: %d bytes", esp_get_free_heap_size());
    
    /* 创建主任务 */
    xTaskCreatePinnedToCore(main_task, "main_task", 4096, NULL, 5, &main_task_handle, 1);
} 