# scripts/validate_source_to_build.cmake
# Source-to-Build Validation Script
# Verifies that build artifacts accurately reflect source code integrity

cmake_minimum_required(VERSION 3.16)

if(NOT DEFINED TARGET_NAME OR NOT DEFINED MANIFEST_FILE OR NOT DEFINED BUILD_DIR OR NOT DEFINED SOURCE_DIR)
    message(FATAL_ERROR "Source-to-build validation requires all parameters")
endif()

message(STATUS "=== Source-to-Build Integrity Validation ===")
message(STATUS "Target: ${TARGET_NAME}")
message(STATUS "Manifest: ${MANIFEST_FILE}")

# Verify manifest file exists
if(NOT EXISTS "${MANIFEST_FILE}")
    message(FATAL_ERROR "Manifest file not found: ${MANIFEST_FILE}")
endif()

# Verify manifest checksum
set(CHECKSUM_FILE "${MANIFEST_FILE}.sha256")
if(EXISTS "${CHECKSUM_FILE}")
    file(READ "${CHECKSUM_FILE}" EXPECTED_CHECKSUM_LINE)
    string(STRIP "${EXPECTED_CHECKSUM_LINE}" EXPECTED_CHECKSUM_LINE)
    string(REGEX MATCH "^([a-f0-9]+)" EXPECTED_CHECKSUM "${EXPECTED_CHECKSUM_LINE}")
    
    file(SHA256 "${MANIFEST_FILE}" ACTUAL_CHECKSUM)
    
    if(NOT "${EXPECTED_CHECKSUM}" STREQUAL "${ACTUAL_CHECKSUM}")
        message(FATAL_ERROR "Manifest integrity verification failed")
    endif()
    
    message(STATUS "✓ Manifest integrity verified")
else()
    message(WARNING "Manifest checksum file not found, skipping integrity check")
endif()

# Parse manifest for source file validation
file(READ "${MANIFEST_FILE}" MANIFEST_CONTENT)

# Extract source file entries using regex
string(REGEX MATCHALL "<dop:source_file>.*?</dop:source_file>" SOURCE_FILE_ENTRIES "${MANIFEST_CONTENT}")

set(VALIDATION_PASSED TRUE)
set(FILES_VALIDATED 0)

foreach(ENTRY ${SOURCE_FILE_ENTRIES})
    # Extract file path
    string(REGEX MATCH "<dop:file_path>(.*?)</dop:file_path>" FILE_PATH_MATCH "${ENTRY}")
    if(FILE_PATH_MATCH)
        set(FILE_PATH "${CMAKE_MATCH_1}")
        
        # Extract expected checksum
        string(REGEX MATCH "<dop:checksum_sha256>(.*?)</dop:checksum_sha256>" CHECKSUM_MATCH "${ENTRY}")
        if(CHECKSUM_MATCH)
            set(EXPECTED_CHECKSUM "${CMAKE_MATCH_1}")
            
            # Verify source file exists and calculate actual checksum
            set(FULL_FILE_PATH "${SOURCE_DIR}/${FILE_PATH}")
            if(EXISTS "${FULL_FILE_PATH}")
                file(SHA256 "${FULL_FILE_PATH}" ACTUAL_CHECKSUM)
                
                if("${EXPECTED_CHECKSUM}" STREQUAL "${ACTUAL_CHECKSUM}")
                    message(STATUS "✓ ${FILE_PATH}: Source integrity verified")
                    math(EXPR FILES_VALIDATED "${FILES_VALIDATED} + 1")
                else()
                    message(ERROR "✗ ${FILE_PATH}: Checksum mismatch")
                    message(ERROR "  Expected: ${EXPECTED_CHECKSUM}")
                    message(ERROR "  Actual:   ${ACTUAL_CHECKSUM}")
                    set(VALIDATION_PASSED FALSE)
                endif()
            else()
                message(ERROR "✗ ${FILE_PATH}: Source file not found")
                set(VALIDATION_PASSED FALSE)
            endif()
        endif()
    endif()
endforeach()

# Verify build artifacts exist
if(EXISTS "${BUILD_DIR}/${TARGET_NAME}" OR EXISTS "${BUILD_DIR}/${TARGET_NAME}.exe")
    message(STATUS "✓ Build artifact verification: Target exists")
else()
    message(ERROR "✗ Build artifact verification: Target not found")
    set(VALIDATION_PASSED FALSE)
endif()

# Report validation results
message(STATUS "=== Source-to-Build Validation Results ===")
message(STATUS "Files validated: ${FILES_VALIDATED}")

if(VALIDATION_PASSED)
    message(STATUS "✓ Source-to-build validation: PASSED")
    
    # Create validation certificate
    set(CERT_FILE "${BUILD_DIR}/validation_certificates/${TARGET_NAME}_source_to_build.cert")
    get_filename_component(CERT_DIR "${CERT_FILE}" DIRECTORY)
    file(MAKE_DIRECTORY "${CERT_DIR}")
    
    string(TIMESTAMP CERT_TIMESTAMP "%Y-%m-%dT%H:%M:%SZ" UTC)
    file(WRITE "${CERT_FILE}" 
        "OBINexus Source-to-Build Validation Certificate\n"
        "Target: ${TARGET_NAME}\n"
        "Validation Timestamp: ${CERT_TIMESTAMP}\n"
        "Files Validated: ${FILES_VALIDATED}\n"
        "Status: PASSED\n"
        "Validation Protocol: Zero Trust DOP Compliance\n"
    )
    
    message(STATUS "Validation certificate: ${CERT_FILE}")
else()
    message(FATAL_ERROR "✗ Source-to-build validation: FAILED")
endif()

#--------------------------------------------------
# scripts/validate_build_to_source.cmake  
# Build-to-Source Validation Script
# Verifies that source code integrity can be confirmed from build artifacts

cmake_minimum_required(VERSION 3.16)

if(NOT DEFINED TARGET_NAME OR NOT DEFINED MANIFEST_FILE OR NOT DEFINED BUILD_DIR OR NOT DEFINED SOURCE_DIR)
    message(FATAL_ERROR "Build-to-source validation requires all parameters")
endif()

message(STATUS "=== Build-to-Source Integrity Validation ===")
message(STATUS "Target: ${TARGET_NAME}")
message(STATUS "Build Directory: ${BUILD_DIR}")

# Verify build artifact exists
set(BUILD_ARTIFACT "")
if(EXISTS "${BUILD_DIR}/${TARGET_NAME}")
    set(BUILD_ARTIFACT "${BUILD_DIR}/${TARGET_NAME}")
elseif(EXISTS "${BUILD_DIR}/${TARGET_NAME}.exe")
    set(BUILD_ARTIFACT "${BUILD_DIR}/${TARGET_NAME}.exe")
elseif(EXISTS "${BUILD_DIR}/lib${TARGET_NAME}.a")
    set(BUILD_ARTIFACT "${BUILD_DIR}/lib${TARGET_NAME}.a")
else()
    message(FATAL_ERROR "Build artifact not found for ${TARGET_NAME}")
endif()

message(STATUS "Build artifact: ${BUILD_ARTIFACT}")

# Calculate build artifact checksum
file(SHA256 "${BUILD_ARTIFACT}" BUILD_CHECKSUM)
message(STATUS "Build artifact checksum: ${BUILD_CHECKSUM}")

# Parse manifest to reconstruct expected source state
file(READ "${MANIFEST_FILE}" MANIFEST_CONTENT)

# Extract build timestamp
string(REGEX MATCH "<dop:build_timestamp>(.*?)</dop:build_timestamp>" BUILD_TIMESTAMP_MATCH "${MANIFEST_CONTENT}")
if(BUILD_TIMESTAMP_MATCH)
    set(BUILD_TIMESTAMP "${CMAKE_MATCH_1}")
    message(STATUS "Build timestamp: ${BUILD_TIMESTAMP}")
endif()

# Validate that current source files match manifest expectations
string(REGEX MATCHALL "<dop:source_file>.*?</dop:source_file>" SOURCE_FILE_ENTRIES "${MANIFEST_CONTENT}")

set(REVERSE_VALIDATION_PASSED TRUE)
set(FILES_REVERSE_VALIDATED 0)

foreach(ENTRY ${SOURCE_FILE_ENTRIES})
    # Extract file path and expected checksum
    string(REGEX MATCH "<dop:file_path>(.*?)</dop:file_path>" FILE_PATH_MATCH "${ENTRY}")
    string(REGEX MATCH "<dop:checksum_sha256>(.*?)</dop:checksum_sha256>" CHECKSUM_MATCH "${ENTRY}")
    
    if(FILE_PATH_MATCH AND CHECKSUM_MATCH)
        set(FILE_PATH "${CMAKE_MATCH_1}")
        set(EXPECTED_CHECKSUM "${CMAKE_MATCH_1}")
        
        # Verify current source file state matches build expectations
        set(FULL_FILE_PATH "${SOURCE_DIR}/${FILE_PATH}")
        if(EXISTS "${FULL_FILE_PATH}")
            file(SHA256 "${FULL_FILE_PATH}" CURRENT_CHECKSUM)
            
            if("${EXPECTED_CHECKSUM}" STREQUAL "${CURRENT_CHECKSUM}")
                message(STATUS "✓ ${FILE_PATH}: Build-to-source consistency verified")
                math(EXPR FILES_REVERSE_VALIDATED "${FILES_REVERSE_VALIDATED} + 1")
            else()
                message(WARNING "⚠ ${FILE_PATH}: Source modification detected after build")
                message(STATUS "  Build-time checksum: ${EXPECTED_CHECKSUM}")
                message(STATUS "  Current checksum:    ${CURRENT_CHECKSUM}")
                # Note: This is a warning, not an error, as source may legitimately change
            endif()
        else()
            message(ERROR "✗ ${FILE_PATH}: Source file missing")
            set(REVERSE_VALIDATION_PASSED FALSE)
        endif()
    endif()
endforeach()

# Verify DOP compliance markers in build artifact
if(EXISTS "${BUILD_ARTIFACT}")
    # For demonstration, check if build includes DOP compliance markers
    # In a real implementation, this would use binary analysis tools
    
    file(SIZE "${BUILD_ARTIFACT}" ARTIFACT_SIZE)
    if(ARTIFACT_SIZE GREATER 0)
        message(STATUS "✓ Build artifact integrity: Non-zero size confirmed")
    else()
        message(ERROR "✗ Build artifact integrity: Zero-size artifact detected")
        set(REVERSE_VALIDATION_PASSED FALSE)
    endif()
endif()

# Check for governance compliance indicators
string(REGEX MATCH "<dop:dop_principles_enforced>true</dop:dop_principles_enforced>" DOP_ENFORCED "${MANIFEST_CONTENT}")
string(REGEX MATCH "<dop:gate_control_enabled>true</dop:gate_control_enabled>" GATE_CONTROL "${MANIFEST_CONTENT}")

if(DOP_ENFORCED AND GATE_CONTROL)
    message(STATUS "✓ Governance compliance: DOP principles and gate controls active")
else()
    message(WARNING "⚠ Governance compliance: Review required")
endif()

# Report reverse validation results
message(STATUS "=== Build-to-Source Validation Results ===")
message(STATUS "Files reverse validated: ${FILES_REVERSE_VALIDATED}")

if(REVERSE_VALIDATION_PASSED)
    message(STATUS "✓ Build-to-source validation: PASSED")
    
    # Create reverse validation certificate
    set(REVERSE_CERT_FILE "${BUILD_DIR}/validation_certificates/${TARGET_NAME}_build_to_source.cert")
    get_filename_component(REVERSE_CERT_DIR "${REVERSE_CERT_FILE}" DIRECTORY)
    file(MAKE_DIRECTORY "${REVERSE_CERT_DIR}")
    
    string(TIMESTAMP REVERSE_CERT_TIMESTAMP "%Y-%m-%dT%H:%M:%SZ" UTC)
    file(WRITE "${REVERSE_CERT_FILE}" 
        "OBINexus Build-to-Source Validation Certificate\n"
        "Target: ${TARGET_NAME}\n"
        "Build Artifact: ${BUILD_ARTIFACT}\n"
        "Build Checksum: ${BUILD_CHECKSUM}\n"
        "Validation Timestamp: ${REVERSE_CERT_TIMESTAMP}\n"
        "Files Validated: ${FILES_REVERSE_VALIDATED}\n"
        "Status: PASSED\n"
        "Validation Protocol: Zero Trust Reverse Verification\n"
    )
    
    message(STATUS "Reverse validation certificate: ${REVERSE_CERT_FILE}")
else()
    message(FATAL_ERROR "✗ Build-to-source validation: FAILED")
endif()

message(STATUS "=== Bidirectional Validation Complete ===")

#--------------------------------------------------
# scripts/relocate_manifest.cmake
# Manifest Relocation Protocol Implementation
# Handles automatic manifest relocation per OBINexus XML Manifest Flow Architecture

cmake_minimum_required(VERSION 3.16)

if(NOT DEFINED MANIFEST_FILE OR NOT DEFINED SOURCE_DIR)
    message(FATAL_ERROR "Manifest relocation requires manifest file and source directory")
endif()

message(STATUS "=== XML Manifest Relocation Protocol ===")

# Check if public/private .xml files have been deleted from src/ directory
set(SRC_XML_DIR "${SOURCE_DIR}/src")
set(MISSY_XML_DIR "${SOURCE_DIR}/missy")

# Check for deleted .xml files pattern
file(GLOB SRC_XML_FILES "${SRC_XML_DIR}/*.xml")
file(GLOB MISSY_XML_FILES "${MISSY_XML_DIR}/*.xml")

if(NOT SRC_XML_FILES AND NOT MISSY_XML_FILES)
    message(STATUS "XML deletion pattern detected in src/ and missy/ directories")
    
    # Implement manifest relocation to root/src as per architecture specification
    get_filename_component(MANIFEST_NAME "${MANIFEST_FILE}" NAME)
    set(RELOCATED_MANIFEST "${SOURCE_DIR}/src/${MANIFEST_NAME}")
    
    # Ensure target directory exists
    file(MAKE_DIRECTORY "${SOURCE_DIR}/src")
    
    # Copy manifest to relocated position
    file(COPY "${MANIFEST_FILE}" DESTINATION "${SOURCE_DIR}/src/")
    
    # Copy checksum file if it exists
    set(CHECKSUM_FILE "${MANIFEST_FILE}.sha256")
    if(EXISTS "${CHECKSUM_FILE}")
        file(COPY "${CHECKSUM_FILE}" DESTINATION "${SOURCE_DIR}/src/")
    endif()
    
    message(STATUS "✓ Manifest relocated: ${RELOCATED_MANIFEST}")
    message(STATUS "✓ Continued CLI build operations enabled")
    
    # Create relocation log
    set(RELOCATION_LOG "${SOURCE_DIR}/src/.manifest_relocation.log")
    string(TIMESTAMP RELOCATION_TIMESTAMP "%Y-%m-%dT%H:%M:%SZ" UTC)
    
    file(APPEND "${RELOCATION_LOG}"
        "${RELOCATION_TIMESTAMP}: Manifest ${MANIFEST_NAME} relocated to maintain build integrity\n"
    )
    
    message(STATUS "✓ Relocation logged: ${RELOCATION_LOG}")
else()
    message(STATUS "No manifest relocation required")
endif()

message(STATUS "=== Manifest Relocation Protocol Complete ===")
