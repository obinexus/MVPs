#include "obinexus_dop_core.h"
#include "dop_adapter.h"
#include "dop_topology.h"
#include "dop_manifest.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

static void print_component_info(const dop_component_t* component) {
    if (!component) return;
    
    printf("Component ID: %s\n", component->metadata.component_id);
    printf("Component Name: %s\n", component->metadata.component_name);
    printf("Version: %s\n", component->metadata.version);
    printf("State: %d\n", component->metadata.state);
    printf("Gate State: %d\n", component->metadata.gate_state);
    printf("Checksum: 0x%08X\n", component->checksum);
    printf("\n");
}

static int test_component_functionality(void) {
    printf("=== Testing Component Functionality ===\n");
    
    // Test Alarm Component
    dop_component_t* alarm = dop_func_create_component(DOP_COMPONENT_ALARM);
    if (!alarm) {
        printf("Failed to create alarm component\n");
        return 1;
    }
    
    dop_gate_open(alarm);
    print_component_info(alarm);
    
    dop_time_data_t alarm_time = dop_time_get_current();
    alarm_time.hours = 7;
    alarm_time.minutes = 30;
    
    if (dop_alarm_set_time(alarm, alarm_time) == DOP_SUCCESS) {
        printf("Alarm time set successfully\n");
    }
    
    if (dop_alarm_arm(alarm) == DOP_SUCCESS) {
        printf("Alarm armed successfully\n");
    }
    
    dop_func_destroy_component(alarm);
    
    // Test Clock Component
    dop_component_t* clock = dop_func_create_component(DOP_COMPONENT_CLOCK);
    if (!clock) {
        printf("Failed to create clock component\n");
        return 1;
    }
    
    dop_gate_open(clock);
    print_component_info(clock);
    
    dop_clock_set_format(clock, false); // 12-hour format
    char* formatted_time = dop_clock_format_time(clock);
    if (formatted_time) {
        printf("Formatted time: %s\n", formatted_time);
        free(formatted_time);
    }
    
    dop_func_destroy_component(clock);
    
    printf("Component functionality test completed\n\n");
    return 0;
}

static int test_func_to_oop_conversion(void) {
    printf("=== Testing Function to OOP Conversion ===\n");
    
    // Create OOP interface from functional components
    dop_oop_interface_t* oop_interface = dop_adapter_func_to_oop(
        dop_func_create_component,
        dop_func_update_component,
        dop_func_destroy_component,
        dop_func_serialize_component
    );
    
    if (!oop_interface) {
        printf("Failed to create OOP interface\n");
        return 1;
    }
    
    // Use OOP interface
    if (oop_interface->create(oop_interface->instance, DOP_COMPONENT_TIMER) == DOP_SUCCESS) {
        printf("OOP component created successfully\n");
        
        dop_component_t* component = oop_interface->get_data(oop_interface->instance);
        if (component) {
            dop_gate_open(component);
            print_component_info(component);
        }
        
        if (oop_interface->update(oop_interface->instance) == DOP_SUCCESS) {
            printf("OOP component updated successfully\n");
        }
    }
    
    free(oop_interface->instance);
    free(oop_interface);
    
    printf("Function to OOP conversion test completed\n\n");
    return 0;
}

static int test_p2p_topology(void) {
    printf("=== Testing P2P Topology ===\n");
    
    // Create components
    dop_component_t* alarm = dop_func_create_component(DOP_COMPONENT_ALARM);
    dop_component_t* clock = dop_func_create_component(DOP_COMPONENT_CLOCK);
    
    if (!alarm || !clock) {
        printf("Failed to create components\n");
        return 1;
    }
    
    // Create topology nodes
    dop_topology_node_t* node1 = dop_topology_create_node("node_alarm_01", alarm);
    dop_topology_node_t* node2 = dop_topology_create_node("node_clock_01", clock);
    
    if (!node1 || !node2) {
        printf("Failed to create topology nodes\n");
        return 1;
    }
    
    // Add peer connections
    dop_topology_add_peer(node1, node2);
    dop_topology_add_peer(node2, node1);
    
    // Create build topology
    dop_build_topology_t topology = {0};
    strncpy(topology.build_id, "test_p2p_topology", sizeof(topology.build_id) - 1);
    topology.nodes[0] = node1;
    topology.nodes[1] = node2;
    topology.node_count = 2;
    topology.is_p2p_enabled = true;
    topology.is_fault_tolerant = true;
    
    // Start P2P network
    if (dop_topology_start_p2p_network(&topology) == DOP_SUCCESS) {
        printf("P2P network started successfully\n");
        
        // Run for a short time
        sleep(2);
        
        // Test fault tolerance
        if (dop_topology_test_fault_tolerance(&topology) == DOP_SUCCESS) {
            printf("Fault tolerance test passed\n");
        }
    }
    
    // Cleanup
    dop_func_destroy_component(alarm);
    dop_func_destroy_component(clock);
    free(node1);
    free(node2);
    
    printf("P2P topology test completed\n\n");
    return 0;
}

static int test_xml_manifest(void) {
    printf("=== Testing XML Manifest ===\n");
    
    // Create a basic topology
    dop_build_topology_t topology = {0};
    strncpy(topology.build_id, "test_manifest", sizeof(topology.build_id) - 1);
    topology.is_p2p_enabled = true;
    topology.is_fault_tolerant = true;
    
    // Save to XML
    const char* xml_path = "test_manifest.xml";
    if (dop_manifest_save_to_xml(&topology, xml_path) == DOP_SUCCESS) {
        printf("Manifest saved to XML successfully\n");
        
        // Load from XML
        dop_build_topology_t loaded_topology = {0};
        if (dop_manifest_load_from_xml(xml_path, &loaded_topology) == DOP_SUCCESS) {
            printf("Manifest loaded from XML successfully\n");
            printf("Loaded build ID: %s\n", loaded_topology.build_id);
        }
        
        // Validate schema
        if (dop_manifest_validate_schema(xml_path) == DOP_SUCCESS) {
            printf("Manifest schema validation passed\n");
        }
    }
    
    printf("XML manifest test completed\n\n");
    return 0;
}

int main(int argc, char* argv[]) {
    printf("OBINexus DOP Component System Demo\n");
    printf("==================================\n\n");
    
    if (argc > 1) {
        if (strcmp(argv[1], "--test-p2p-fault") == 0) {
            return test_p2p_topology();
        } else if (strcmp(argv[1], "--test-xml-manifest") == 0) {
            return test_xml_manifest();
        } else if (strcmp(argv[1], "--validate-manifest") == 0) {
            return dop_manifest_validate_schema("examples/time_components_manifest.xml");
        } else if (strcmp(argv[1], "--test-p2p-topology") == 0) {
            return test_p2p_topology();
        }
    }
    
    // Run all tests
    int result = 0;
    result |= test_component_functionality();
    result |= test_func_to_oop_conversion();
    result |= test_p2p_topology();
    result |= test_xml_manifest();
    
    if (result == 0) {
        printf("All tests completed successfully!\n");
    } else {
        printf("Some tests failed!\n");
    }
    
    return result;
}
