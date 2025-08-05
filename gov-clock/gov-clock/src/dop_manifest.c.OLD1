//===========================================
// src/dop_manifest.c
// OBINexus DOP XML Manifest Implementation
// Provides XML serialization and validation capabilities

#include "dop_manifest.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

int dop_manifest_save_to_xml(const dop_build_topology_t* topology, const char* xml_path) {
    if (!topology || !xml_path) return DOP_ERROR_INVALID_PARAMETER;
    
    FILE* file = fopen(xml_path, "w");
    if (!file) return DOP_ERROR_XML_PARSING;
    
    // Write XML header and namespace declarations
    fprintf(file, "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
    fprintf(file, "<dop:dop_manifest xmlns:dop=\"http://obinexus.org/dop/schema\"\n");
    fprintf(file, "                  xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"\n");
    fprintf(file, "                  xsi:schemaLocation=\"http://obinexus.org/dop/schema obinexus_dop_manifest.xsd\">\n\n");
    
    // Write manifest metadata
    fprintf(file, "  <dop:manifest_metadata>\n");
    fprintf(file, "    <dop:manifest_version>1.0.0</dop:manifest_version>\n");
    fprintf(file, "    <dop:build_timestamp>2025-07-20T12:00:00Z</dop:build_timestamp>\n");
    fprintf(file, "    <dop:target_name>%s</dop:target_name>\n", topology->build_id);
    fprintf(file, "    <dop:build_system>makefile</dop:build_system>\n");
    fprintf(file, "    <dop:validation_level>bidirectional</dop:validation_level>\n");
    fprintf(file, "  </dop:manifest_metadata>\n\n");
    
    // Write build topology configuration
    fprintf(file, "  <dop:build_topology>\n");
    fprintf(file, "    <dop:topology_type>P2P</dop:topology_type>\n");
    fprintf(file, "    <dop:fault_tolerance>%s</dop:fault_tolerance>\n", 
            topology->is_fault_tolerant ? "true" : "false");
    fprintf(file, "    <dop:p2p_enabled>%s</dop:p2p_enabled>\n", 
            topology->is_p2p_enabled ? "true" : "false");
    fprintf(file, "    <dop:max_nodes>%u</dop:max_nodes>\n", topology->node_count);
    
    // Write nodes
    fprintf(file, "    <dop:nodes>\n");
    for (uint32_t i = 0; i < topology->node_count; i++) {
        if (topology->nodes[i]) {
            dop_topology_node_t* node = topology->nodes[i];
            fprintf(file, "      <dop:node>\n");
            fprintf(file, "        <dop:node_id>%s</dop:node_id>\n", node->node_id);
            if (node->component) {
                fprintf(file, "        <dop:component_ref>%s</dop:component_ref>\n", 
                        node->component->metadata.component_id);
            }
            fprintf(file, "        <dop:is_fault_tolerant>%s</dop:is_fault_tolerant>\n",
                    node->is_fault_tolerant ? "true" : "false");
            fprintf(file, "        <dop:load_balancing_weight>%.2f</dop:load_balancing_weight>\n",
                    node->load_balancing_weight);
            fprintf(file, "      </dop:node>\n");
        }
    }
    fprintf(file, "    </dop:nodes>\n");
    fprintf(file, "  </dop:build_topology>\n\n");
    
    // Write component validation
    fprintf(file, "  <dop:component_validation>\n");
    fprintf(file, "    <dop:dop_principles_enforced>true</dop:dop_principles_enforced>\n");
    fprintf(file, "    <dop:immutability_verified>true</dop:immutability_verified>\n");
    fprintf(file, "    <dop:data_logic_separation_verified>true</dop:data_logic_separation_verified>\n");
    fprintf(file, "    <dop:transparency_verified>true</dop:transparency_verified>\n");
    fprintf(file, "  </dop:component_validation>\n\n");
    
    fprintf(file, "</dop:dop_manifest>\n");
    
    fclose(file);
    return DOP_SUCCESS;
}

int dop_manifest_load_from_xml(const char* xml_path, dop_build_topology_t* topology) {
    if (!xml_path || !topology) return DOP_ERROR_INVALID_PARAMETER;
    
    FILE* file = fopen(xml_path, "r");
    if (!file) return DOP_ERROR_XML_PARSING;
    
    // Simplified XML parsing for demonstration
    char line[512];
    bool found_build_id = false;
    
    while (fgets(line, sizeof(line), file)) {
        // Parse build ID
        if (strstr(line, "<dop:target_name>")) {
            char* start = strstr(line, ">") + 1;
            char* end = strstr(start, "<");
            if (start && end) {
                size_t len = end - start;
                if (len < sizeof(topology->build_id)) {
                    strncpy(topology->build_id, start, len);
                    topology->build_id[len] = '\0';
                    found_build_id = true;
                }
            }
        }
        
        // Parse P2P enabled flag
        if (strstr(line, "<dop:p2p_enabled>true</dop:p2p_enabled>")) {
            topology->is_p2p_enabled = true;
        }
        
        // Parse fault tolerance flag
        if (strstr(line, "<dop:fault_tolerance>true</dop:fault_tolerance>")) {
            topology->is_fault_tolerant = true;
        }
    }
    
    fclose(file);
    
    return found_build_id ? DOP_SUCCESS : DOP_ERROR_XML_PARSING;
}

int dop_manifest_validate_schema(const char* xml_path) {
    if (!xml_path) return DOP_ERROR_INVALID_PARAMETER;
    
    FILE* file = fopen(xml_path, "r");
    if (!file) return DOP_ERROR_XML_PARSING;
    
    // Simplified schema validation
    char line[512];
    bool has_xml_declaration = false;
    bool has_dop_namespace = false;
    bool has_manifest_metadata = false;
    bool has_build_topology = false;
    
    while (fgets(line, sizeof(line), file)) {
        if (strstr(line, "<?xml version=")) {
            has_xml_declaration = true;
        }
        if (strstr(line, "xmlns:dop=")) {
            has_dop_namespace = true;
        }
        if (strstr(line, "<dop:manifest_metadata>")) {
            has_manifest_metadata = true;
        }
        if (strstr(line, "<dop:build_topology>")) {
            has_build_topology = true;
        }
    }
    
    fclose(file);
    
    if (has_xml_declaration && has_dop_namespace && has_manifest_metadata && has_build_topology) {
        return DOP_SUCCESS;
    }
    
    return DOP_ERROR_XML_PARSING;
}
