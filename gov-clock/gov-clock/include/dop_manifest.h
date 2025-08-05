#ifndef DOP_MANIFEST_H
#define DOP_MANIFEST_H

#include "obinexus_dop_core.h"

// XML manifest integration function declarations
int dop_manifest_load_from_xml(const char* xml_path, dop_build_topology_t* topology);
int dop_manifest_save_to_xml(const dop_build_topology_t* topology, const char* xml_path);
int dop_manifest_validate_schema(const char* xml_path);

#endif // DOP_MANIFEST_H
