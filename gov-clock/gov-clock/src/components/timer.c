#include "obinexus_dop_core.h"

int dop_timer_set_duration(dop_component_t* component, uint64_t duration_ms) {
    if (!component || component->metadata.type != DOP_COMPONENT_TIMER) {
        return DOP_ERROR_INVALID_PARAMETER;
    }
    
    pthread_mutex_lock(&component->metadata.mutex);
    component->data.timer.duration.timestamp_ms = duration_ms;
    component->checksum = dop_checksum_calculate(component);
    pthread_mutex_unlock(&component->metadata.mutex);
    
    return DOP_SUCCESS;
}

int dop_timer_start(dop_component_t* component) {
    if (!component || component->metadata.type != DOP_COMPONENT_TIMER) {
        return DOP_ERROR_INVALID_PARAMETER;
    }
    
    pthread_mutex_lock(&component->metadata.mutex);
    component->data.timer.start_time = dop_time_get_current();
    component->data.timer.is_running = true;
    component->data.timer.is_expired = false;
    component->checksum = dop_checksum_calculate(component);
    pthread_mutex_unlock(&component->metadata.mutex);
    
    return DOP_SUCCESS;
}

int dop_timer_stop(dop_component_t* component) {
    if (!component || component->metadata.type != DOP_COMPONENT_TIMER) {
        return DOP_ERROR_INVALID_PARAMETER;
    }
    
    pthread_mutex_lock(&component->metadata.mutex);
    component->data.timer.is_running = false;
    component->checksum = dop_checksum_calculate(component);
    pthread_mutex_unlock(&component->metadata.mutex);
    
    return DOP_SUCCESS;
}

int dop_timer_reset(dop_component_t* component) {
    if (!component || component->metadata.type != DOP_COMPONENT_TIMER) {
        return DOP_ERROR_INVALID_PARAMETER;
    }
    
    pthread_mutex_lock(&component->metadata.mutex);
    component->data.timer.is_running = false;
    component->data.timer.is_expired = false;
    // Reset to current time
    component->data.timer.start_time = dop_time_get_current();
    component->checksum = dop_checksum_calculate(component);
    pthread_mutex_unlock(&component->metadata.mutex);
    
    return DOP_SUCCESS;
}

bool dop_timer_is_expired(const dop_component_t* component) {
    if (!component || component->metadata.type != DOP_COMPONENT_TIMER) {
        return false;
    }
    
    return component->data.timer.is_expired;
}
