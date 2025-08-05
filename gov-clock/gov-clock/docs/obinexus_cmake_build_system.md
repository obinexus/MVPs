# OBINexus DOP Build System Implementation

## CMakeLists.txt - Main Build Configuration

```cmake
cmake_minimum_required(VERSION 3.16)
project(OBINexus_DOP_Components 
    VERSION 1.0.0 
    DESCRIPTION "OBINexus Data-Oriented Programming Component System"
    LANGUAGES C)

# OBINexus Build Configuration
set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)
set(CMAKE_C_EXTENSIONS OFF)

# Build Type Configuration
if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE "Debug" CACHE STRING "Build type" FORCE)
endif()

# OBINexus Compiler Flags
set(CMAKE_C_FLAGS_DEBUG "-g -O0 -Wall -Wextra -Wpedantic -DDOP_DEBUG=1")
set(CMAKE_C_FLAGS_RELEASE "-O3 -DNDEBUG -DDOP_RELEASE=1")

# Threading Support (Required for P2P Topology)
find_package(Threads REQUIRED)

# XML Processing Library for Manifest Support
find_package(PkgConfig REQUIRED)
pkg_check_modules(LIBXML2 REQUIRED libxml-2.0)

# Include Directories
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/include)
include_directories(${LIBXML2_INCLUDE_DIRS})

# Source Files
set(DOP_CORE_SOURCES
    src/obinexus_dop_core.c
    src/dop_adapter.c
    src/dop_topology.c
    src/dop_manifest.c
    src/components/alarm.c
    src/components/clock.c
    src/components/stopwatch.c
    src/components/timer.c
)

# Header Files
set(DOP_CORE_HEADERS
    include/obinexus_dop_core.h
    include/dop_adapter.h
    include/dop_topology.h
    include/dop_manifest.h
)

# Main DOP Library Target
add_library(obinexus_dop_core STATIC ${DOP_CORE_SOURCES})
target_link_libraries(obinexus_dop_core 
    ${CMAKE_THREAD_LIBS_INIT}
    ${LIBXML2_LIBRARIES}
)
target_compile_options(obinexus_dop_core PRIVATE ${LIBXML2_CFLAGS_OTHER})

# Demo Application
add_executable(dop_demo 
    src/demo/dop_demo.c
    src/demo/p2p_topology_test.c
    src/demo/func_oop_conversion_test.c
)
target_link_libraries(dop_demo obinexus_dop_core)

# Unit Tests
enable_testing()
add_executable(dop_tests
    tests/test_components.c
    tests/test_topology.c
    tests/test_manifest.c
    tests/test_adapter.c
)
target_link_libraries(dop_tests obinexus_dop_core)

# Test Registration
add_test(NAME component_tests COMMAND dop_tests component)
add_test(NAME topology_tests COMMAND dop_tests topology)
add_test(NAME manifest_tests COMMAND dop_tests manifest)
add_test(NAME adapter_tests COMMAND dop_tests adapter)

# P2P Fault Tolerance Test
add_test(NAME p2p_fault_test COMMAND dop_demo --test-p2p-fault)

# XML Manifest Validation Test
add_test(NAME xml_manifest_test COMMAND dop_demo --test-xml-manifest)

# Custom Build Targets
add_custom_target(validate_manifest
    COMMAND ${CMAKE_CURRENT_BINARY_DIR}/dop_demo --validate-manifest 
    WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
    COMMENT "Validating XML manifest schema"
)

add_custom_target(test_p2p_topology
    COMMAND ${CMAKE_CURRENT_BINARY_DIR}/dop_demo --test-p2p-topology
    WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
    COMMENT "Testing P2P fault-tolerant topology"
)

# Install Configuration
install(TARGETS obinexus_dop_core dop_demo
    LIBRARY DESTINATION lib
    ARCHIVE DESTINATION lib
    RUNTIME DESTINATION bin
)

install(FILES ${DOP_CORE_HEADERS}
    DESTINATION include/obinexus
)

install(FILES schemas/dop_manifest.xsd
    DESTINATION share/obinexus/schemas
)

# CPack Configuration for Distribution
set(CPACK_PACKAGE_NAME "OBINexus-DOP-Components")
set(CPACK_PACKAGE_VERSION_MAJOR 1)
set(CPACK_PACKAGE_VERSION_MINOR 0)
set(CPACK_PACKAGE_VERSION_PATCH 0)
set(CPACK_PACKAGE_DESCRIPTION_SUMMARY "OBINexus Data-Oriented Programming Component System")
include(CPack)
```

## XML Manifest Schema (schemas/dop_manifest.xsd)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
           xmlns:dop="http://obinexus.org/dop/v1.0"
           targetNamespace="http://obinexus.org/dop/v1.0"
           elementFormDefault="qualified">

  <!-- Root Element: DOP Component Manifest -->
  <xs:element name="dop_manifest">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="metadata" type="dop:manifestMetadata"/>
        <xs:element name="build_topology" type="dop:buildTopology"/>
        <xs:element name="components" type="dop:componentList"/>
        <xs:element name="governance" type="dop:governanceConfig"/>
        <xs:element name="cryptographic_verification" type="dop:cryptoVerification"/>
      </xs:sequence>
      <xs:attribute name="schema_version" type="xs:string" fixed="1.0.0"/>
      <xs:attribute name="manifest_id" type="xs:string" use="required"/>
    </xs:complexType>
  </xs:element>

  <!-- Manifest Metadata -->
  <xs:complexType name="manifestMetadata">
    <xs:sequence>
      <xs:element name="build_id" type="xs:string"/>
      <xs:element name="creation_timestamp" type="xs:dateTime"/>
      <xs:element name="last_update_timestamp" type="xs:dateTime"/>
      <xs:element name="creator" type="xs:string"/>
      <xs:element name="version" type="xs:string"/>
      <xs:element name="nnam_id" type="xs:string"/>
      <xs:element name="build_target" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>

  <!-- Build Topology Configuration -->
  <xs:complexType name="buildTopology">
    <xs:sequence>
      <xs:element name="topology_type" type="dop:topologyType"/>
      <xs:element name="fault_tolerance" type="xs:boolean"/>
      <xs:element name="p2p_enabled" type="xs:boolean"/>
      <xs:element name="max_nodes" type="xs:positiveInteger"/>
      <xs:element name="network_configuration" type="dop:networkConfig"/>
      <xs:element name="nodes" type="dop:nodeList"/>
    </xs:sequence>
  </xs:complexType>

  <!-- Topology Types -->
  <xs:simpleType name="topologyType">
    <xs:restriction base="xs:string">
      <xs:enumeration value="P2P"/>
      <xs:enumeration value="BUS"/>
      <xs:enumeration value="STAR"/>
      <xs:enumeration value="RING"/>
      <xs:enumeration value="MESH"/>
      <xs:enumeration value="HYBRID"/>
    </xs:restriction>
  </xs:simpleType>

  <!-- Network Configuration -->
  <xs:complexType name="networkConfig">
    <xs:sequence>
      <xs:element name="communication_protocol" type="xs:string"/>
      <xs:element name="encryption_enabled" type="xs:boolean"/>
      <xs:element name="timeout_ms" type="xs:positiveInteger"/>
      <xs:element name="retry_count" type="xs:nonNegativeInteger"/>
      <xs:element name="heartbeat_interval_ms" type="xs:positiveInteger"/>
    </xs:sequence>
  </xs:complexType>

  <!-- Node List -->
  <xs:complexType name="nodeList">
    <xs:sequence>
      <xs:element name="node" type="dop:topologyNode" maxOccurs="unbounded"/>
    </xs:sequence>
  </xs:complexType>

  <!-- Topology Node -->
  <xs:complexType name="topologyNode">
    <xs:sequence>
      <xs:element name="node_id" type="xs:string"/>
      <xs:element name="component_ref" type="xs:string"/>
      <xs:element name="peer_connections" type="dop:peerConnections"/>
      <xs:element name="is_fault_tolerant" type="xs:boolean"/>
      <xs:element name="load_balancing_weight" type="xs:double"/>
    </xs:sequence>
  </xs:complexType>

  <!-- Peer Connections -->
  <xs:complexType name="peerConnections">
    <xs:sequence>
      <xs:element name="peer" type="xs:string" maxOccurs="unbounded"/>
    </xs:sequence>
  </xs:complexType>

  <!-- Component List -->
  <xs:complexType name="componentList">
    <xs:sequence>
      <xs:element name="component" type="dop:component" maxOccurs="unbounded"/>
    </xs:sequence>
  </xs:complexType>

  <!-- Component Definition -->
  <xs:complexType name="component">
    <xs:sequence>
      <xs:element name="component_id" type="xs:string"/>
      <xs:element name="component_name" type="xs:string"/>
      <xs:element name="component_type" type="dop:componentType"/>
      <xs:element name="version" type="xs:string"/>
      <xs:element name="state" type="dop:componentState"/>
      <xs:element name="gate_state" type="dop:gateState"/>
      <xs:element name="data_model" type="dop:dataModel"/>
      <xs:element name="behavior_interface" type="dop:behaviorInterface"/>
      <xs:element name="integrity_checksum" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>

  <!-- Component Types -->
  <xs:simpleType name="componentType">
    <xs:restriction base="xs:string">
      <xs:enumeration value="ALARM"/>
      <xs:enumeration value="CLOCK"/>
      <xs:enumeration value="STOPWATCH"/>
      <xs:enumeration value="TIMER"/>
    </xs:restriction>
  </xs:simpleType>

  <!-- Component States -->
  <xs:simpleType name="componentState">
    <xs:restriction base="xs:string">
      <xs:enumeration value="UNINITIALIZED"/>
      <xs:enumeration value="READY"/>
      <xs:enumeration value="EXECUTING"/>
      <xs:enumeration value="SUSPENDED"/>
      <xs:enumeration value="ERROR"/>
      <xs:enumeration value="DESTROYED"/>
    </xs:restriction>
  </xs:simpleType>

  <!-- Gate States -->
  <xs:simpleType name="gateState">
    <xs:restriction base="xs:string">
      <xs:enumeration value="CLOSED"/>
      <xs:enumeration value="OPEN"/>
      <xs:enumeration value="ISOLATED"/>
    </xs:restriction>
  </xs:simpleType>

  <!-- Data Model -->
  <xs:complexType name="dataModel">
    <xs:sequence>
      <xs:element name="immutable_data" type="xs:boolean"/>
      <xs:element name="transparent_structure" type="xs:boolean"/>
      <xs:element name="validation_rules" type="dop:validationRules"/>
      <xs:element name="serialization_format" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>

  <!-- Validation Rules -->
  <xs:complexType name="validationRules">
    <xs:sequence>
      <xs:element name="rule" type="dop:validationRule" maxOccurs="unbounded"/>
    </xs:sequence>
  </xs:complexType>

  <!-- Validation Rule -->
  <xs:complexType name="validationRule">
    <xs:sequence>
      <xs:element name="field_name" type="xs:string"/>
      <xs:element name="rule_type" type="xs:string"/>
      <xs:element name="rule_value" type="xs:string"/>
      <xs:element name="error_message" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>

  <!-- Behavior Interface -->
  <xs:complexType name="behaviorInterface">
    <xs:sequence>
      <xs:element name="programming_paradigm" type="dop:programmingParadigm"/>
      <xs:element name="function_signatures" type="dop:functionSignatures"/>
      <xs:element name="oop_interface" type="dop:oopInterface"/>
      <xs:element name="adapter_configuration" type="dop:adapterConfig"/>
    </xs:sequence>
  </xs:complexType>

  <!-- Programming Paradigm -->
  <xs:simpleType name="programmingParadigm">
    <xs:restriction base="xs:string">
      <xs:enumeration value="FUNCTIONAL"/>
      <xs:enumeration value="OOP"/>
      <xs:enumeration value="HYBRID"/>
    </xs:restriction>
  </xs:simpleType>

  <!-- Function Signatures -->
  <xs:complexType name="functionSignatures">
    <xs:sequence>
      <xs:element name="function" type="dop:functionSignature" maxOccurs="unbounded"/>
    </xs:sequence>
  </xs:complexType>

  <!-- Function Signature -->
  <xs:complexType name="functionSignature">
    <xs:sequence>
      <xs:element name="name" type="xs:string"/>
      <xs:element name="return_type" type="xs:string"/>
      <xs:element name="parameters" type="dop:parameterList"/>
      <xs:element name="is_pure_function" type="xs:boolean"/>
    </xs:sequence>
  </xs:complexType>

  <!-- Parameter List -->
  <xs:complexType name="parameterList">
    <xs:sequence>
      <xs:element name="parameter" type="dop:parameter" maxOccurs="unbounded"/>
    </xs:sequence>
  </xs:complexType>

  <!-- Parameter -->
  <xs:complexType name="parameter">
    <xs:sequence>
      <xs:element name="name" type="xs:string"/>
      <xs:element name="type" type="xs:string"/>
      <xs:element name="is_const" type="xs:boolean"/>
    </xs:sequence>
  </xs:complexType>

  <!-- OOP Interface -->
  <xs:complexType name="oopInterface">
    <xs:sequence>
      <xs:element name="class_name" type="xs:string"/>
      <xs:element name="methods" type="dop:methodList"/>
      <xs:element name="encapsulation_level" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>

  <!-- Method List -->
  <xs:complexType name="methodList">
    <xs:sequence>
      <xs:element name="method" type="dop:method" maxOccurs="unbounded"/>
    </xs:sequence>
  </xs:complexType>

  <!-- Method -->
  <xs:complexType name="method">
    <xs:sequence>
      <xs:element name="name" type="xs:string"/>
      <xs:element name="visibility" type="xs:string"/>
      <xs:element name="is_virtual" type="xs:boolean"/>
      <xs:element name="function_ref" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>

  <!-- Adapter Configuration -->
  <xs:complexType name="adapterConfig">
    <xs:sequence>
      <xs:element name="func_to_oop_enabled" type="xs:boolean"/>
      <xs:element name="oop_to_func_enabled" type="xs:boolean"/>
      <xs:element name="adapter_overhead_ms" type="xs:double"/>
      <xs:element name="conversion_cache_enabled" type="xs:boolean"/>
    </xs:sequence>
  </xs:complexType>

  <!-- Governance Configuration -->
  <xs:complexType name="governanceConfig">
    <xs:sequence>
      <xs:element name="gate_control_enabled" type="xs:boolean"/>
      <xs:element name="access_control_policy" type="xs:string"/>
      <xs:element name="audit_logging_enabled" type="xs:boolean"/>
      <xs:element name="isolation_boundaries" type="dop:isolationBoundaries"/>
      <xs:element name="compliance_validation" type="dop:complianceValidation"/>
    </xs:sequence>
  </xs:complexType>

  <!-- Isolation Boundaries -->
  <xs:complexType name="isolationBoundaries">
    <xs:sequence>
      <xs:element name="memory_isolation" type="xs:boolean"/>
      <xs:element name="process_isolation" type="xs:boolean"/>
      <xs:element name="network_isolation" type="xs:boolean"/>
      <xs:element name="file_system_isolation" type="xs:boolean"/>
    </xs:sequence>
  </xs:complexType>

  <!-- Compliance Validation -->
  <xs:complexType name="complianceValidation">
    <xs:sequence>
      <xs:element name="dop_principles_enforced" type="xs:boolean"/>
      <xs:element name="immutability_verified" type="xs:boolean"/>
      <xs:element name="data_logic_separation_verified" type="xs:boolean"/>
      <xs:element name="transparency_verified" type="xs:boolean"/>
    </xs:sequence>
  </xs:complexType>

  <!-- Cryptographic Verification -->
  <xs:complexType name="cryptoVerification">
    <xs:sequence>
      <xs:element name="integrity_algorithm" type="xs:string"/>
      <xs:element name="signature_algorithm" type="xs:string"/>
      <xs:element name="key_management" type="dop:keyManagement"/>
      <xs:element name="verification_chain" type="dop:verificationChain"/>
    </xs:sequence>
  </xs:complexType>

  <!-- Key Management -->
  <xs:complexType name="keyManagement">
    <xs:sequence>
      <xs:element name="public_key_path" type="xs:string"/>
      <xs:element name="private_key_path" type="xs:string"/>
      <xs:element name="key_rotation_enabled" type="xs:boolean"/>
      <xs:element name="key_expiration_timestamp" type="xs:dateTime"/>
    </xs:sequence>
  </xs:complexType>

  <!-- Verification Chain -->
  <xs:complexType name="verificationChain">
    <xs:sequence>
      <xs:element name="verification_step" type="dop:verificationStep" maxOccurs="unbounded"/>
    </xs:sequence>
  </xs:complexType>

  <!-- Verification Step -->
  <xs:complexType name="verificationStep">
    <xs:sequence>
      <xs:element name="step_name" type="xs:string"/>
      <xs:element name="verification_method" type="xs:string"/>
      <xs:element name="expected_result" type="xs:string"/>
      <xs:element name="dependency" type="xs:string" minOccurs="0"/>
    </xs:sequence>
  </xs:complexType>

</xs:schema>
```

## Example XML Manifest (examples/time_components_manifest.xml)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<dop:dop_manifest xmlns:dop="http://obinexus.org/dop/v1.0"
                  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                  xsi:schemaLocation="http://obinexus.org/dop/v1.0 ../schemas/dop_manifest.xsd"
                  schema_version="1.0.0"
                  manifest_id="time_components_p2p_demo">

  <dop:metadata>
    <dop:build_id>time_comp_build_20250720_001</dop:build_id>
    <dop:creation_timestamp>2025-07-20T10:30:00Z</dop:creation_timestamp>
    <dop:last_update_timestamp>2025-07-20T10:30:00Z</dop:last_update_timestamp>
    <dop:creator>OBINexus-DOP-System</dop:creator>
    <dop:version>1.0.0</dop:version>
    <dop:nnam_id>NNAM-ID-001</dop:nnam_id>
    <dop:build_target>riftlang.exe → .so.a → rift.exe → gosilang</dop:build_target>
  </dop:metadata>

  <dop:build_topology>
    <dop:topology_type>P2P</dop:topology_type>
    <dop:fault_tolerance>true</dop:fault_tolerance>
    <dop:p2p_enabled>true</dop:p2p_enabled>
    <dop:max_nodes>4</dop:max_nodes>
    <dop:network_configuration>
      <dop:communication_protocol>TCP</dop:communication_protocol>
      <dop:encryption_enabled>true</dop:encryption_enabled>
      <dop:timeout_ms>5000</dop:timeout_ms>
      <dop:retry_count>3</dop:retry_count>
      <dop:heartbeat_interval_ms>1000</dop:heartbeat_interval_ms>
    </dop:network_configuration>
    <dop:nodes>
      <dop:node>
        <dop:node_id>node_alarm_01</dop:node_id>
        <dop:component_ref>alarm_component_01</dop:component_ref>
        <dop:peer_connections>
          <dop:peer>node_clock_01</dop:peer>
          <dop:peer>node_timer_01</dop:peer>
        </dop:peer_connections>
        <dop:is_fault_tolerant>true</dop:is_fault_tolerant>
        <dop:load_balancing_weight>1.0</dop:load_balancing_weight>
      </dop:node>
      <dop:node>
        <dop:node_id>node_clock_01</dop:node_id>
        <dop:component_ref>clock_component_01</dop:component_ref>
        <dop:peer_connections>
          <dop:peer>node_alarm_01</dop:peer>
          <dop:peer>node_stopwatch_01</dop:peer>
        </dop:peer_connections>
        <dop:is_fault_tolerant>true</dop:is_fault_tolerant>
        <dop:load_balancing_weight>1.0</dop:load_balancing_weight>
      </dop:node>
      <dop:node>
        <dop:node_id>node_stopwatch_01</dop:node_id>
        <dop:component_ref>stopwatch_component_01</dop:component_ref>
        <dop:peer_connections>
          <dop:peer>node_clock_01</dop:peer>
          <dop:peer>node_timer_01</dop:peer>
        </dop:peer_connections>
        <dop:is_fault_tolerant>true</dop:is_fault_tolerant>
        <dop:load_balancing_weight>1.0</dop:load_balancing_weight>
      </dop:node>
      <dop:node>
        <dop:node_id>node_timer_01</dop:node_id>
        <dop:component_ref>timer_component_01</dop:component_ref>
        <dop:peer_connections>
          <dop:peer>node_alarm_01</dop:peer>
          <dop:peer>node_stopwatch_01</dop:peer>
        </dop:peer_connections>
        <dop:is_fault_tolerant>true</dop:is_fault_tolerant>
        <dop:load_balancing_weight>1.0</dop:load_balancing_weight>
      </dop:node>
    </dop:nodes>
  </dop:build_topology>

  <dop:components>
    <dop:component>
      <dop:component_id>alarm_component_01</dop:component_id>
      <dop:component_name>Alarm Component</dop:component_name>
      <dop:component_type>ALARM</dop:component_type>
      <dop:version>1.0.0</dop:version>
      <dop:state>READY</dop:state>
      <dop:gate_state>CLOSED</dop:gate_state>
      <dop:data_model>
        <dop:immutable_data>true</dop:immutable_data>
        <dop:transparent_structure>true</dop:transparent_structure>
        <dop:validation_rules>
          <dop:rule>
            <dop:field_name>alarm_time</dop:field_name>
            <dop:rule_type>time_format</dop:rule_type>
            <dop:rule_value>HH:MM:SS</dop:rule_value>
            <dop:error_message>Invalid time format</dop:error_message>
          </dop:rule>
        </dop:validation_rules>
        <dop:serialization_format>JSON</dop:serialization_format>
      </dop:data_model>
      <dop:behavior_interface>
        <dop:programming_paradigm>HYBRID</dop:programming_paradigm>
        <dop:function_signatures>
          <dop:function>
            <dop:name>dop_alarm_set_time</dop:name>
            <dop:return_type>int</dop:return_type>
            <dop:parameters>
              <dop:parameter>
                <dop:name>component</dop:name>
                <dop:type>dop_component_t*</dop:type>
                <dop:is_const>false</dop:is_const>
              </dop:parameter>
              <dop:parameter>
                <dop:name>alarm_time</dop:name>
                <dop:type>dop_time_data_t</dop:type>
                <dop:is_const>true</dop:is_const>
              </dop:parameter>
            </dop:parameters>
            <dop:is_pure_function>false</dop:is_pure_function>
          </dop:function>
        </dop:function_signatures>
        <dop:oop_interface>
          <dop:class_name>AlarmComponent</dop:class_name>
          <dop:methods>
            <dop:method>
              <dop:name>setTime</dop:name>
              <dop:visibility>public</dop:visibility>
              <dop:is_virtual>false</dop:is_virtual>
              <dop:function_ref>dop_alarm_set_time</dop:function_ref>
            </dop:method>
          </dop:methods>
          <dop:encapsulation_level>private</dop:encapsulation_level>
        </dop:oop_interface>
        <dop:adapter_configuration>
          <dop:func_to_oop_enabled>true</dop:func_to_oop_enabled>
          <dop:oop_to_func_enabled>true</dop:oop_to_func_enabled>
          <dop:adapter_overhead_ms>0.1</dop:adapter_overhead_ms>
          <dop:conversion_cache_enabled>true</dop:conversion_cache_enabled>
        </dop:adapter_configuration>
      </dop:behavior_interface>
      <dop:integrity_checksum>A1B2C3D4E5F6</dop:integrity_checksum>
    </dop:component>
    <!-- Additional components (clock, stopwatch, timer) would follow similar structure -->
  </dop:components>

  <dop:governance>
    <dop:gate_control_enabled>true</dop:gate_control_enabled>
    <dop:access_control_policy>strict</dop:access_control_policy>
    <dop:audit_logging_enabled>true</dop:audit_logging_enabled>
    <dop:isolation_boundaries>
      <dop:memory_isolation>true</dop:memory_isolation>
      <dop:process_isolation>false</dop:process_isolation>
      <dop:network_isolation>false</dop:network_isolation>
      <dop:file_system_isolation>true</dop:file_system_isolation>
    </dop:isolation_boundaries>
    <dop:compliance_validation>
      <dop:dop_principles_enforced>true</dop:dop_principles_enforced>
      <dop:immutability_verified>true</dop:immutability_verified>
      <dop:data_logic_separation_verified>true</dop:data_logic_separation_verified>
      <dop:transparency_verified>true</dop:transparency_verified>
    </dop:compliance_validation>
  </dop:governance>

  <dop:cryptographic_verification>
    <dop:integrity_algorithm>SHA256</dop:integrity_algorithm>
    <dop:signature_algorithm>RSA-2048</dop:signature_algorithm>
    <dop:key_management>
      <dop:public_key_path>keys/manifest.pub</dop:public_key_path>
      <dop:private_key_path>keys/manifest.key</dop:private_key_path>
      <dop:key_rotation_enabled>true</dop:key_rotation_enabled>
      <dop:key_expiration_timestamp>2025-12-31T23:59:59Z</dop:key_expiration_timestamp>
    </dop:key_management>
    <dop:verification_chain>
      <dop:verification_step>
        <dop:step_name>component_integrity</dop:step_name>
        <dop:verification_method>checksum_validation</dop:verification_method>
        <dop:expected_result>pass</dop:expected_result>
      </dop:verification_step>
      <dop:verification_step>
        <dop:step_name>topology_validation</dop:step_name>
        <dop:verification_method>p2p_connectivity_test</dop:verification_method>
        <dop:expected_result>pass</dop:expected_result>
        <dop:dependency>component_integrity</dop:dependency>
      </dop:verification_step>
    </dop:verification_chain>
  </dop:cryptographic_verification>

</dop:dop_manifest>
```

## Makefile - Alternative Build System

```makefile
# OBINexus DOP Components Makefile
# Alternative build system for environments without CMake

# Compiler Configuration
CC = gcc
CFLAGS = -std=c11 -Wall -Wextra -Wpedantic -pthread
LDFLAGS = -pthread -lxml2

# Debug/Release Configuration
DEBUG_CFLAGS = $(CFLAGS) -g -O0 -DDOP_DEBUG=1
RELEASE_CFLAGS = $(CFLAGS) -O3 -DNDEBUG -DDOP_RELEASE=1

# Directories
SRC_DIR = src
INCLUDE_DIR = include
BUILD_DIR = build
TEST_DIR = tests
DEMO_DIR = src/demo

# Source Files
CORE_SOURCES = $(wildcard $(SRC_DIR)/*.c) $(wildcard $(SRC_DIR)/components/*.c)
TEST_SOURCES = $(wildcard $(TEST_DIR)/*.c)
DEMO_SOURCES = $(wildcard $(DEMO_DIR)/*.c)

# Object Files
CORE_OBJECTS = $(CORE_SOURCES:%.c=$(BUILD_DIR)/%.o)
TEST_OBJECTS = $(TEST_SOURCES:%.c=$(BUILD_DIR)/%.o)
DEMO_OBJECTS = $(DEMO_SOURCES:%.c=$(BUILD_DIR)/%.o)

# Targets
STATIC_LIB = $(BUILD_DIR)/libobinexus_dop_core.a
DEMO_EXECUTABLE = $(BUILD_DIR)/dop_demo
TEST_EXECUTABLE = $(BUILD_DIR)/dop_tests

# Default Target
all: debug

# Debug Build
debug: CFLAGS := $(DEBUG_CFLAGS)
debug: $(STATIC_LIB) $(DEMO_EXECUTABLE) $(TEST_EXECUTABLE)

# Release Build
release: CFLAGS := $(RELEASE_CFLAGS)
release: $(STATIC_LIB) $(DEMO_EXECUTABLE) $(TEST_EXECUTABLE)

# Static Library
$(STATIC_LIB): $(CORE_OBJECTS) | $(BUILD_DIR)
	ar rcs $@ $^

# Demo Executable
$(DEMO_EXECUTABLE): $(DEMO_OBJECTS) $(STATIC_LIB) | $(BUILD_DIR)
	$(CC) $(DEMO_OBJECTS) $(STATIC_LIB) $(LDFLAGS) -o $@

# Test Executable
$(TEST_EXECUTABLE): $(TEST_OBJECTS) $(STATIC_LIB) | $(BUILD_DIR)
	$(CC) $(TEST_OBJECTS) $(STATIC_LIB) $(LDFLAGS) -o $@

# Object File Compilation
$(BUILD_DIR)/%.o: %.c | $(BUILD_DIR)
	@mkdir -p $(dir $@)
	$(CC) $(CFLAGS) -I$(INCLUDE_DIR) -c $< -o $@

# Create Build Directory
$(BUILD_DIR):
	mkdir -p $(BUILD_DIR)

# Test Targets
test: $(TEST_EXECUTABLE)
	$(TEST_EXECUTABLE) component
	$(TEST_EXECUTABLE) topology
	$(TEST_EXECUTABLE) manifest
	$(TEST_EXECUTABLE) adapter

test-p2p: $(DEMO_EXECUTABLE)
	$(DEMO_EXECUTABLE) --test-p2p-fault

test-manifest: $(DEMO_EXECUTABLE)
	$(DEMO_EXECUTABLE) --test-xml-manifest

# Validation Targets
validate-manifest: $(DEMO_EXECUTABLE)
	$(DEMO_EXECUTABLE) --validate-manifest

validate-schema:
	xmllint --schema schemas/dop_manifest.xsd examples/time_components_manifest.xml --noout

# Clean
clean:
	rm -rf $(BUILD_DIR)

# Install
install: release
	install -d /usr/local/lib
	install -d /usr/local/include/obinexus
	install -d /usr/local/share/obinexus/schemas
	install $(STATIC_LIB) /usr/local/lib/
	install $(DEMO_EXECUTABLE) /usr/local/bin/
	install $(INCLUDE_DIR)/*.h /usr/local/include/obinexus/
	install schemas/dop_manifest.xsd /usr/local/share/obinexus/schemas/

# Uninstall
uninstall:
	rm -f /usr/local/lib/libobinexus_dop_core.a
	rm -f /usr/local/bin/dop_demo
	rm -rf /usr/local/include/obinexus
	rm -rf /usr/local/share/obinexus

# Help
help:
	@echo "OBINexus DOP Components Build System"
	@echo "Available targets:"
	@echo "  all              - Build debug version (default)"
	@echo "  debug            - Build debug version"
	@echo "  release          - Build release version"
	@echo "  test             - Run unit tests"
	@echo "  test-p2p         - Run P2P topology tests"
	@echo "  test-manifest    - Run XML manifest tests"
	@echo "  validate-manifest - Validate XML manifest"
	@echo "  validate-schema  - Validate XML schema"
	@echo "  clean            - Clean build files"
	@echo "  install          - Install system-wide"
	@echo "  uninstall        - Uninstall system-wide"
	@echo "  help             - Show this help"

.PHONY: all debug release test test-p2p test-manifest validate-manifest validate-schema clean install uninstall help
```

## Build Instructions

### Using CMake (Recommended)
```bash
mkdir build && cd build
cmake ..
make
make test
make validate_manifest
make test_p2p_topology
```

### Using Makefile (Alternative)
```bash
make debug
make test
make validate-manifest
make test-p2p
```

This build system implements the complete OBINexus DOP framework with C implementation, XML manifest schema validation, P2P fault-tolerant topology testing, and function-to-OOP conversion capabilities as specified in your requirements.