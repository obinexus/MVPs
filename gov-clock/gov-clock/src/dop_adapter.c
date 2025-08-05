// src/dop_adapter.c
// OBINexus DOP Adapter Implementation
// Provides Function <-> OOP conversion capabilities

#include "dop_adapter.h"
#include <stdlib.h>
#include <string.h>

// OOP Interface Implementation Structure
typedef struct {
    dop_component_t* component;
    dop_func_create_t create_func;
    dop_func_update_t update_func;
    dop_func_destroy_t destroy_func;
    dop_func_serialize_t serialize_func;
} dop_oop_instance_t;

// OOP Interface Methods
static int oop_create(void* instance, dop_component_type_t type) {
    dop_oop_instance_t* oop_inst = (dop_oop_instance_t*)instance;
    if (!oop_inst || !oop_inst->create_func) return DOP_ERROR_INVALID_PARAMETER;
    
    oop_inst->component = oop_inst->create_func(type);
    return oop_inst->component ? DOP_SUCCESS : DOP_ERROR_MEMORY_ALLOCATION;
}

static int oop_update(void* instance) {
    dop_oop_instance_t* oop_inst = (dop_oop_instance_t*)instance;
    if (!oop_inst || !oop_inst->update_func || !oop_inst->component) {
        return DOP_ERROR_INVALID_PARAMETER;
    }
    
    return oop_inst->update_func(oop_inst->component);
}

static int oop_destroy(void* instance) {
    dop_oop_instance_t* oop_inst = (dop_oop_instance_t*)instance;
    if (!oop_inst || !oop_inst->destroy_func || !oop_inst->component) {
        return DOP_ERROR_INVALID_PARAMETER;
    }
    
    return oop_inst->destroy_func(oop_inst->component);
}

static char* oop_serialize(void* instance) {
    dop_oop_instance_t* oop_inst = (dop_oop_instance_t*)instance;
    if (!oop_inst || !oop_inst->serialize_func || !oop_inst->component) {
        return NULL;
    }
    
    return oop_inst->serialize_func(oop_inst->component);
}

static dop_component_t* oop_get_data(void* instance) {
    dop_oop_instance_t* oop_inst = (dop_oop_instance_t*)instance;
    return oop_inst ? oop_inst->component : NULL;
}

// Function to OOP Conversion Implementation
dop_oop_interface_t* dop_adapter_func_to_oop(dop_func_create_t create_func,
                                              dop_func_update_t update_func,
                                              dop_func_destroy_t destroy_func,
                                              dop_func_serialize_t serialize_func) {
    if (!create_func || !update_func || !destroy_func || !serialize_func) {
        return NULL;
    }
    
    // Allocate OOP interface structure
    dop_oop_interface_t* interface = malloc(sizeof(dop_oop_interface_t));
    if (!interface) return NULL;
    
    // Allocate instance data
    dop_oop_instance_t* instance = malloc(sizeof(dop_oop_instance_t));
    if (!instance) {
        free(interface);
        return NULL;
    }
    
    // Initialize instance with function pointers
    instance->component = NULL;
    instance->create_func = create_func;
    instance->update_func = update_func;
    instance->destroy_func = destroy_func;
    instance->serialize_func = serialize_func;
    
    // Setup interface methods
    interface->instance = instance;
    interface->create = oop_create;
    interface->update = oop_update;
    interface->destroy = oop_destroy;
    interface->serialize = oop_serialize;
    interface->get_data = oop_get_data;
    
    return interface;
}

dop_func_create_t dop_adapter_oop_to_func_create(dop_oop_interface_t* oop_interface) {
    (void)oop_interface;
    return dop_func_create_component;
}

dop_func_update_t dop_adapter_oop_to_func_update(dop_oop_interface_t* oop_interface) {
    (void)oop_interface;
    return dop_func_update_component;
}
