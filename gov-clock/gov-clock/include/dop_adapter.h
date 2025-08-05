#ifndef DOP_ADAPTER_H
#define DOP_ADAPTER_H

#include "obinexus_dop_core.h"

// Adapter function declarations
dop_oop_interface_t* dop_adapter_func_to_oop(dop_func_create_t create_func,
                                              dop_func_update_t update_func,
                                              dop_func_destroy_t destroy_func,
                                              dop_func_serialize_t serialize_func);

dop_func_create_t dop_adapter_oop_to_func_create(dop_oop_interface_t* oop_interface);
dop_func_update_t dop_adapter_oop_to_func_update(dop_oop_interface_t* oop_interface);

#endif // DOP_ADAPTER_H
