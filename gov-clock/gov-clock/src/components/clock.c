#include "obinexus_dop_core.h"
#include <stdio.h>
#include <stdlib.h>

int dop_clock_set_timezone(dop_component_t* component, int32_t offset_hours) {
    if (!component || component->metadata.type != DOP_COMPONENT_CLOCK) {
        return DOP_ERROR_INVALID_PARAMETER;
    }
    
    pthread_mutex_lock(&component->metadata.mutex);
    component->data.clock.timezone_offset = offset_hours;
    component->checksum = dop_checksum_calculate(component);
    pthread_mutex_unlock(&component->metadata.mutex);
    
    return DOP_SUCCESS;
}

int dop_clock_set_format(dop_component_t* component, bool is_24_hour) {
    if (!component || component->metadata.type != DOP_COMPONENT_CLOCK) {
        return DOP_ERROR_INVALID_PARAMETER;
    }
    
    pthread_mutex_lock(&component->metadata.mutex);
    component->data.clock.is_24_hour_format = is_24_hour;
    component->checksum = dop_checksum_calculate(component);
    pthread_mutex_unlock(&component->metadata.mutex);
    
    return DOP_SUCCESS;
}

char* dop_clock_format_time(const dop_component_t* component) {
    if (!component || component->metadata.type != DOP_COMPONENT_CLOCK) {
        return NULL;
    }
    
    char* formatted_time = malloc(32);
    if (!formatted_time) return NULL;
    
    const dop_time_data_t* time = &component->data.clock.current_time;
    
    if (component->data.clock.is_24_hour_format) {
        snprintf(formatted_time, 32, "%02u:%02u:%02u.%03u", 
                time->hours, time->minutes, time->seconds, time->milliseconds);
    } else {
        uint32_t display_hour = time->hours;
        const char* ampm = "AM";
        
        if (display_hour == 0) {
            display_hour = 12;
        } else if (display_hour > 12) {
            display_hour -= 12;
            ampm = "PM";
        } else if (display_hour == 12) {
            ampm = "PM";
        }
        
        snprintf(formatted_time, 32, "%u:%02u:%02u.%03u %s", 
                display_hour, time->minutes, time->seconds, time->milliseconds, ampm);
    }
    
    return formatted_time;
}
