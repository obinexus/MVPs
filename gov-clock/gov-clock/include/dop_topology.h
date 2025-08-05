#ifndef DOP_TOPOLOGY_H
#define DOP_TOPOLOGY_H

#include "obinexus_dop_core.h"

// Topology management function declarations
dop_topology_node_t* dop_topology_create_node(const char* node_id, dop_component_t* component);
int dop_topology_add_peer(dop_topology_node_t* node, dop_topology_node_t* peer);
int dop_topology_start_p2p_network(dop_build_topology_t* topology);
int dop_topology_test_fault_tolerance(dop_build_topology_t* topology);

#endif // DOP_TOPOLOGY_H
