// obinexus_dop_core.h
// OBINexus Data-Oriented Programming Core Implementation
// Proof of Concept for Component Orchestration System

#ifndef OBINEXUS_DOP_CORE_H
#define OBINEXUS_DOP_CORE_H

#include <stdint.h>
#include <stdbool.h>
#include <time.h>
#include <pthread.h>
#include <stdio.h>
// Data-Oriented Programming Core Types
typedef enum {
    DOP_COMPONENT_ALARM = 0,
    DOP_COMPONENT_CLOCK = 1,
    DOP_COMPONENT_STOPWATCH = 2,
    DOP_COMPONENT_TIMER = 3,
    DOP_COMPONENT_COUNT
} dop_component_type_t;

typedef enum {
    DOP_STATE_UNINITIALIZED = 0,
    DOP_STATE_READY = 1,
    DOP_STATE_EXECUTING = 2,
    DOP_STATE_SUSPENDED = 3,
    DOP_STATE_ERROR = 4,
    DOP_STATE_DESTROYED = 5
} dop_component_state_t;

typedef enum {
    DOP_GATE_CLOSED = 0,
    DOP_GATE_OPEN = 1,
    DOP_GATE_ISOLATED = 2
} dop_gate_state_t;

// Data Structures (Immutable Data Principle)
typedef struct {
    uint64_t timestamp_ms;
    uint32_t hours;
    uint32_t minutes;
    uint32_t seconds;
    uint32_t milliseconds;
    bool is_valid;
} dop_time_data_t;

typedef struct {
    dop_time_data_t alarm_time;
    dop_time_data_t current_time;
    bool is_armed;
    bool is_triggered;
    uint32_t snooze_duration_ms;
} dop_alarm_data_t;

typedef struct {
    dop_time_data_t current_time;
    bool is_running;
    uint32_t timezone_offset;
    bool is_24_hour_format;
} dop_clock_data_t;

typedef struct {
    dop_time_data_t start_time;
    dop_time_data_t current_time;
    dop_time_data_t elapsed_time;
    bool is_running;
    bool is_paused;
    uint32_t lap_count;
} dop_stopwatch_data_t;

typedef struct {
    dop_time_data_t start_time;
    dop_time_data_t duration;
    dop_time_data_t remaining;
    bool is_running;
    bool is_expired;
    bool auto_restart;
} dop_timer_data_t;

// Component Metadata (Separated from Logic)
typedef struct {
    char component_id[64];
    char component_name[128];
    char version[32];
    dop_component_type_t type;
    dop_component_state_t state;
    dop_gate_state_t gate_state;
    uint64_t creation_timestamp;
    uint64_t last_update_timestamp;
    pthread_mutex_t mutex;
} dop_component_metadata_t;

// Unified Component Data Union
typedef union {
    dop_alarm_data_t alarm;
    dop_clock_data_t clock;
    dop_stopwatch_data_t stopwatch;
    dop_timer_data_t timer;
} dop_component_data_t;

// Complete Component Structure
typedef struct {
    dop_component_metadata_t metadata;
    dop_component_data_t data;
    uint32_t checksum; // For integrity validation
} dop_component_t;

// Function Pointer Types (Behavior Separation)
typedef dop_component_t* (*dop_func_create_t)(dop_component_type_t type);
typedef int (*dop_func_update_t)(dop_component_t* component);
typedef int (*dop_func_destroy_t)(dop_component_t* component);
typedef char* (*dop_func_serialize_t)(const dop_component_t* component);

// OOP-Style Interface Structure
typedef struct {
    void* instance;
    int (*create)(void* self, dop_component_type_t type);
    int (*update)(void* self);
    int (*destroy)(void* self);
    char* (*serialize)(void* self);
    dop_component_t* (*get_data)(void* self);
} dop_oop_interface_t;

// Topology Node for P2P Network
typedef struct dop_topology_node {
    char node_id[64];
    dop_component_t* component;
    struct dop_topology_node* peers[4]; // Max 4 peers for demo
    uint32_t peer_count;
    bool is_fault_tolerant;
    pthread_t worker_thread;
} dop_topology_node_t;

// Build System Integration
typedef struct {
    char build_id[64];
    char manifest_path[256];
    dop_topology_node_t* nodes[16]; // Max 16 nodes
    uint32_t node_count;
    bool is_p2p_enabled;
    bool is_fault_tolerant;
} dop_build_topology_t;

// Core Function Declarations
// Functional Programming Interface
dop_component_t* dop_func_create_component(dop_component_type_t type);
int dop_func_update_component(dop_component_t* component);
int dop_func_destroy_component(dop_component_t* component);
char* dop_func_serialize_component(const dop_component_t* component);

// Object-Oriented Programming Interface
dop_oop_interface_t* dop_oop_create_interface(dop_component_type_t type);
int dop_oop_destroy_interface(dop_oop_interface_t* interface);

// Adapter Functions (Function <-> OOP Conversion)
dop_oop_interface_t* dop_adapter_func_to_oop(dop_func_create_t create_func,
                                              dop_func_update_t update_func,
                                              dop_func_destroy_t destroy_func,
                                              dop_func_serialize_t serialize_func);

dop_func_create_t dop_adapter_oop_to_func_create(dop_oop_interface_t* oop_interface);
dop_func_update_t dop_adapter_oop_to_func_update(dop_oop_interface_t* oop_interface);

// Governance Gates
int dop_gate_open(dop_component_t* component);
int dop_gate_close(dop_component_t* component);
int dop_gate_isolate(dop_component_t* component);
bool dop_gate_is_accessible(const dop_component_t* component);

// Topology Management
dop_topology_node_t* dop_topology_create_node(const char* node_id, dop_component_t* component);
int dop_topology_add_peer(dop_topology_node_t* node, dop_topology_node_t* peer);
int dop_topology_start_p2p_network(dop_build_topology_t* topology);
int dop_topology_test_fault_tolerance(dop_build_topology_t* topology);

// XML Manifest Integration
int dop_manifest_load_from_xml(const char* xml_path, dop_build_topology_t* topology);
int dop_manifest_save_to_xml(const dop_build_topology_t* topology, const char* xml_path);
int dop_manifest_validate_schema(const char* xml_path);

// Time Utilities (Pure Functions)
dop_time_data_t dop_time_get_current(void);
dop_time_data_t dop_time_add_duration(dop_time_data_t base, uint64_t duration_ms);
bool dop_time_is_equal(dop_time_data_t time1, dop_time_data_t time2);
uint64_t dop_time_diff_ms(dop_time_data_t time1, dop_time_data_t time2);

// Component-Specific Logic (Separated from Data)
// Alarm Logic
int dop_alarm_set_time(dop_component_t* component, dop_time_data_t alarm_time);
int dop_alarm_arm(dop_component_t* component);
int dop_alarm_disarm(dop_component_t* component);
bool dop_alarm_is_triggered(const dop_component_t* component);
int dop_alarm_snooze(dop_component_t* component, uint32_t duration_ms);

// Clock Logic
int dop_clock_set_timezone(dop_component_t* component, int32_t offset_hours);
int dop_clock_set_format(dop_component_t* component, bool is_24_hour);
char* dop_clock_format_time(const dop_component_t* component);

// Stopwatch Logic
int dop_stopwatch_start(dop_component_t* component);
int dop_stopwatch_stop(dop_component_t* component);
int dop_stopwatch_pause(dop_component_t* component);
int dop_stopwatch_reset(dop_component_t* component);
int dop_stopwatch_lap(dop_component_t* component);

// Timer Logic
int dop_timer_set_duration(dop_component_t* component, uint64_t duration_ms);
int dop_timer_start(dop_component_t* component);
int dop_timer_stop(dop_component_t* component);
int dop_timer_reset(dop_component_t* component);
bool dop_timer_is_expired(const dop_component_t* component);

// Cryptographic Integrity
uint32_t dop_checksum_calculate(const dop_component_t* component);
bool dop_checksum_verify(const dop_component_t* component);
int dop_component_validate_integrity(const dop_component_t* component);

// Error Handling
typedef enum {
    DOP_SUCCESS = 0,
    DOP_ERROR_INVALID_PARAMETER = 1,
    DOP_ERROR_INVALID_STATE = 2,
    DOP_ERROR_MEMORY_ALLOCATION = 3,
    DOP_ERROR_GATE_CLOSED = 4,
    DOP_ERROR_CHECKSUM_FAILED = 5,
    DOP_ERROR_TOPOLOGY_FAULT = 6,
    DOP_ERROR_XML_PARSING = 7
} dop_error_code_t;

const char* dop_error_to_string(dop_error_code_t error);

#endif // OBINEXUS_DOP_CORE_H

// 
