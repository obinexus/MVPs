#include "obinexus_dop_core.h"
#include <string.h>

int dop_alarm_set_time(dop_component_t* component, dop_time_data_t alarm_time) {
    if (!component || component->metadata.type != DOP_COMPONENT_ALARM) {
        return DOP_ERROR_INVALID_PARAMETER;
    }
    
    if (!dop_gate_is_accessible(component)) {
        return DOP_ERROR_GATE_CLOSED;
    }
    
    pthread_mutex_lock(&component->metadata.mutex);
    component->data.alarm.alarm_time = alarm_time;
    component->checksum = dop_checksum_calculate(component);
    pthread_mutex_unlock(&component->metadata.mutex);
    
    return DOP_SUCCESS;
}

int dop_alarm_arm(dop_component_t* component) {
    if (!component || component->metadata.type != DOP_COMPONENT_ALARM) {
        return DOP_ERROR_INVALID_PARAMETER;
    }
    
    pthread_mutex_lock(&component->metadata.mutex);
    component->data.alarm.is_armed = true;
    component->checksum = dop_checksum_calculate(component);
    pthread_mutex_unlock(&component->metadata.mutex);
    
    return DOP_SUCCESS;
}

int dop_alarm_disarm(dop_component_t* component) {
    if (!component || component->metadata.type != DOP_COMPONENT_ALARM) {
        return DOP_ERROR_INVALID_PARAMETER;
    }
    
    pthread_mutex_lock(&component->metadata.mutex);
    component->data.alarm.is_armed = false;
    component->data.alarm.is_triggered = false;
    component->checksum = dop_checksum_calculate(component);
    pthread_mutex_unlock(&component->metadata.mutex);
    
    return DOP_SUCCESS;
}

bool dop_alarm_is_triggered(const dop_component_t* component) {
    if (!component || component->metadata.type != DOP_COMPONENT_ALARM) {
        return false;
    }
    
    return component->data.alarm.is_triggered;
}

int dop_alarm_snooze(dop_component_t* component, uint32_t duration_ms) {
    if (!component || component->metadata.type != DOP_COMPONENT_ALARM) {
        return DOP_ERROR_INVALID_PARAMETER;
    }
    
    pthread_mutex_lock(&component->metadata.mutex);
    component->data.alarm.snooze_duration_ms = duration_ms;
    component->data.alarm.is_triggered = false;
    component->checksum = dop_checksum_calculate(component);
    pthread_mutex_unlock(&component->metadata.mutex);
    
    return DOP_SUCCESS;
}
