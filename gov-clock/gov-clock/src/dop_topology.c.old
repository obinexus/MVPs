//===========================================
// src/dop_topology.c
// OBINexus DOP Topology Management Implementation
// Provides P2P network and fault tolerance capabilities

#include "dop_topology.h"
#include <stdlib.h>
#include <string.h>

dop_topology_node_t* dop_topology_create_node(const char* node_id, dop_component_t* component) {
    if (!node_id || !component) return NULL;
    
    dop_topology_node_t* node = calloc(1, sizeof(dop_topology_node_t));
    if (!node) return NULL;
    
    strncpy(node->node_id, node_id, sizeof(node->node_id) - 1);
    node->component = component;
    node->peer_count = 0;
    node->is_fault_tolerant = true;
    node->load_balancing_weight = 1.0;
    
    return node;
}

int dop_topology_add_peer(dop_topology_node_t* node, dop_topology_node_t* peer) {
    if (!node || !peer || node->peer_count >= DOP_MAX_PEERS) {
        return DOP_ERROR_INVALID_PARAMETER;
    }
    
    // Check for duplicate peer connections
    for (uint32_t i = 0; i < node->peer_count; i++) {
        if (node->peers[i] == peer) {
            return DOP_SUCCESS; // Already connected
        }
    }
    
    node->peers[node->peer_count] = peer;
    node->peer_count++;
    
    return DOP_SUCCESS;
}

int dop_topology_start_p2p_network(dop_build_topology_t* topology) {
    if (!topology) return DOP_ERROR_INVALID_PARAMETER;
    
    // Initialize all nodes in the topology
    for (uint32_t i = 0; i < topology->node_count; i++) {
        dop_topology_node_t* node = topology->nodes[i];
        if (node && node->component) {
            // Open governance gates for P2P operation
            dop_gate_open(node->component);
            
            // Update component state for network operation
            dop_func_update_component(node->component);
        }
    }
    
    topology->is_p2p_enabled = true;
    return DOP_SUCCESS;
}

int dop_topology_test_fault_tolerance(dop_build_topology_t* topology) {
    if (!topology) return DOP_ERROR_INVALID_PARAMETER;
    
    // Test fault tolerance by simulating node failure and recovery
    for (uint32_t i = 0; i < topology->node_count; i++) {
        dop_topology_node_t* test_node = topology->nodes[i];
        if (test_node && test_node->component && test_node->is_fault_tolerant) {
            // Simulate node isolation
            dop_gate_isolate(test_node->component);
            
            // Verify other nodes continue operation
            bool network_operational = true;
            for (uint32_t j = 0; j < topology->node_count; j++) {
                if (j != i && topology->nodes[j] && topology->nodes[j]->component) {
                    if (!dop_gate_is_accessible(topology->nodes[j]->component)) {
                        network_operational = false;
                        break;
                    }
                }
            }
            
            // Restore isolated node
            dop_gate_open(test_node->component);
            
            if (!network_operational) {
                return DOP_ERROR_TOPOLOGY_FAULT;
            }
        }
    }
    
    return DOP_SUCCESS;
}
