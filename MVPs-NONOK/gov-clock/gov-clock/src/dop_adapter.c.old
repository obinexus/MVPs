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
} dop_oop_impl_t;

// OOP Interface Methods
static int oop_create(void* self, dop_component_type_t type) {
    dop_oop_impl_t* impl = (dop_oop_impl_t*)self;
    if (impl->create_func) {
        impl->component = impl->create_func(type);
        return impl->component ? DOP_SUCCESS : DOP_ERROR_MEMORY_ALLOCATION;
    }
    return DOP_ERROR_INVALID_PARAMETER;
}

static int oop_update(void* self) {
    dop_oop_impl_t* impl = (dop_oop_impl_t*)self;
    if (impl->update_func && impl->component) {
        return impl->update_func(impl->component);
    }
    return DOP_ERROR_INVALID_PARAMETER;
}

static int oop_destroy(void* self) {
    dop_oop_impl_t* impl = (dop_oop_impl_t*)self;
    if (impl->destroy_func && impl->component) {
        return impl->destroy_func(impl->component);
    }
    return DOP_ERROR_INVALID_PARAMETER;
}

static char* oop_serialize(void* self) {
    dop_oop_impl_t* impl = (dop_oop_impl_t*)self;
    if (impl->serialize_func && impl->component) {
        return impl->serialize_func(impl->component);
    }
    return NULL;
}

static dop_component_t* oop_get_data(void* self) {
    dop_oop_impl_t* impl = (dop_oop_impl_t*)self;
    return impl->component;
}

// Adapter Function Implementations
dop_oop_interface_t* dop_adapter_func_to_oop(dop_func_create_t create_func,
                                              dop_func_update_t update_func,
                                              dop_func_destroy_t destroy_func,
                                              dop_func_serialize_t serialize_func) {
    if (!create_func || !update_func) {
        return NULL;
    }
    
    dop_oop_interface_t* interface = calloc(1, sizeof(dop_oop_interface_t));
    if (!interface) return NULL;
    
    dop_oop_impl_t* impl = calloc(1, sizeof(dop_oop_impl_t));
    if (!impl) {
        free(interface);
        return NULL;
    }
    
    impl->create_func = create_func;
    impl->update_func = update_func;
    impl->destroy_func = destroy_func;
    impl->serialize_func = serialize_func;
    
    interface->instance = impl;
    interface->create = oop_create;
    interface->update = oop_update;
    interface->destroy = oop_destroy;
    interface->serialize = oop_serialize;
    interface->get_data = oop_get_data;
    
    return interface;
}

// Wrapper functions for OOP to Functional conversion
static dop_component_t* create_wrapper(dop_component_type_t type) {
    // This would need to be implemented based on specific OOP interface
    return dop_func_create_component(type);
}

static int update_wrapper(dop_component_t* component) {
    return dop_func_update_component(component);
}

dop_func_create_t dop_adapter_oop_to_func_create(dop_oop_interface_t* oop_interface) {
    if (!oop_interface) return NULL;
    return create_wrapper;
}

dop_func_update_t dop_adapter_oop_to_func_update(dop_oop_interface_t* oop_interface) {
    if (!oop_interface) return NULL;
    return update_wrapper;
}
