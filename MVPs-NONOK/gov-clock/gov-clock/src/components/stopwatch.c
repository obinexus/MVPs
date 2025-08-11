#include "obinexus_dop_core.h"
#include <string.h>

int dop_stopwatch_start(dop_component_t* component) {
    if (!component || component->metadata.type != DOP_COMPONENT_STOPWATCH) {
        return DOP_ERROR_INVALID_PARAMETER;
    }
    
    pthread_mutex_lock(&component->metadata.mutex);
    if (!component->data.stopwatch.is_running) {
        component->data.stopwatch.start_time = dop_time_get_current();
        component->data.stopwatch.is_running = true;
        component->data.stopwatch.is_paused = false;
    }
    component->checksum = dop_checksum_calculate(component);
    pthread_mutex_unlock(&component->metadata.mutex);
    
    return DOP_SUCCESS;
}

int dop_stopwatch_stop(dop_component_t* component) {
    if (!component || component->metadata.type != DOP_COMPONENT_STOPWATCH) {
        return DOP_ERROR_INVALID_PARAMETER;
    }
    
    pthread_mutex_lock(&component->metadata.mutex);
    component->data.stopwatch.is_running = false;
    component->data.stopwatch.is_paused = false;
    component->checksum = dop_checksum_calculate(component);
    pthread_mutex_unlock(&component->metadata.mutex);
    
    return DOP_SUCCESS;
}

int dop_stopwatch_pause(dop_component_t* component) {
    if (!component || component->metadata.type != DOP_COMPONENT_STOPWATCH) {
        return DOP_ERROR_INVALID_PARAMETER;
    }
    
    pthread_mutex_lock(&component->metadata.mutex);
    if (component->data.stopwatch.is_running) {
        component->data.stopwatch.is_paused = true;
    }
    component->checksum = dop_checksum_calculate(component);
    pthread_mutex_unlock(&component->metadata.mutex);
    
    return DOP_SUCCESS;
}

int dop_stopwatch_reset(dop_component_t* component) {
    if (!component || component->metadata.type != DOP_COMPONENT_STOPWATCH) {
        return DOP_ERROR_INVALID_PARAMETER;
    }
    
    pthread_mutex_lock(&component->metadata.mutex);
    component->data.stopwatch.is_running = false;
    component->data.stopwatch.is_paused = false;
    component->data.stopwatch.lap_count = 0;
    // Reset elapsed time to zero
    memset(&component->data.stopwatch.elapsed_time, 0, sizeof(dop_time_data_t));
    component->checksum = dop_checksum_calculate(component);
    pthread_mutex_unlock(&component->metadata.mutex);
    
    return DOP_SUCCESS;
}

int dop_stopwatch_lap(dop_component_t* component) {
    if (!component || component->metadata.type != DOP_COMPONENT_STOPWATCH) {
        return DOP_ERROR_INVALID_PARAMETER;
    }
    
    pthread_mutex_lock(&component->metadata.mutex);
    if (component->data.stopwatch.is_running && !component->data.stopwatch.is_paused) {
        component->data.stopwatch.lap_count++;
    }
    component->checksum = dop_checksum_calculate(component);
    pthread_mutex_unlock(&component->metadata.mutex);
    
    return DOP_SUCCESS;
}
