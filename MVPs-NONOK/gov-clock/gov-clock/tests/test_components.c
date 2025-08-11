#include "obinexus_dop_core.h"
#include <stdio.h>
#include <assert.h>
#include <string.h>
#include <stdlib.h>

static void test_alarm_component(void) {
    printf("Testing alarm component...\n");
    
    dop_component_t* alarm = dop_func_create_component(DOP_COMPONENT_ALARM);
    assert(alarm != NULL);
    assert(alarm->metadata.type == DOP_COMPONENT_ALARM);
    
    dop_gate_open(alarm);
    assert(dop_gate_is_accessible(alarm) == true);
    
    dop_time_data_t alarm_time = dop_time_get_current();
    assert(dop_alarm_set_time(alarm, alarm_time) == DOP_SUCCESS);
    assert(dop_alarm_arm(alarm) == DOP_SUCCESS);
    assert(dop_alarm_disarm(alarm) == DOP_SUCCESS);
    
    dop_func_destroy_component(alarm);
    printf("Alarm component test passed\n");
}

static void test_clock_component(void) {
    printf("Testing clock component...\n");
    
    dop_component_t* clock = dop_func_create_component(DOP_COMPONENT_CLOCK);
    assert(clock != NULL);
    assert(clock->metadata.type == DOP_COMPONENT_CLOCK);
    
    dop_gate_open(clock);
    assert(dop_clock_set_timezone(clock, -5) == DOP_SUCCESS);
    assert(dop_clock_set_format(clock, true) == DOP_SUCCESS);
    
    char* formatted = dop_clock_format_time(clock);
    assert(formatted != NULL);
    free(formatted);
    
    dop_func_destroy_component(clock);
    printf("Clock component test passed\n");
}

int main(int argc, char* argv[]) {
    if (argc > 1 && strcmp(argv[1], "component") == 0) {
        test_alarm_component();
        test_clock_component();
        printf("All component tests passed!\n");
        return 0;
    }
    
    printf("Usage: %s component\n", argv[0]);
    return 1;
}
