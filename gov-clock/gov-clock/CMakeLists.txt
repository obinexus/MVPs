# OBINexus Taxonomy-Based Testing Framework
# Comprehensive build system with isolation levels and preflight testing

# CMakeLists.txt - Fixed Build Configuration
cmake_minimum_required(VERSION 3.16)
project(OBINexus_DOP_Components 
    VERSION 1.0.0 
    DESCRIPTION "OBINexus Data-Oriented Programming Component System with Taxonomy Testing"
    LANGUAGES C)

# Build Configuration
set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)
set(CMAKE_C_EXTENSIONS OFF)

# Build Type Configuration
if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE "Debug" CACHE STRING "Build type" FORCE)
endif()

# Taxonomy-Based Compiler Flags
set(CMAKE_C_FLAGS_DEBUG "-g -O0 -Wall -Wextra -Wpedantic -DDOP_DEBUG=1 -DTAXONOMY_TESTING=1")
set(CMAKE_C_FLAGS_RELEASE "-O3 -DNDEBUG -DDOP_RELEASE=1")
set(CMAKE_C_FLAGS_STRESS "-O2 -g -DDOP_STRESS_TEST=1 -DTAXONOMY_STRESS=1")

# Threading Support (No external dependencies)
find_package(Threads REQUIRED)

# Include Directories
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/include)

# Taxonomy-Based Source Organization
set(DOP_ISOLATED_SOURCES
    src/obinexus_dop_core.c
    src/components/alarm.c
    src/components/clock.c
    src/components/stopwatch.c
    src/components/timer.c
)

set(DOP_CLOSED_SOURCES
    src/dop_adapter.c
    src/dop_topology.c
)

set(DOP_OPEN_SOURCES
    src/dop_manifest.c
    src/demo/dop_demo.c
)

# Define Isolation Level Options
option(ENABLE_ISOLATED "Enable isolated system components" ON)
option(ENABLE_CLOSED "Enable closed system components" ON)
option(ENABLE_OPEN "Enable open system components" ON)
option(ENABLE_STRESS_TESTING "Enable stress testing mode" OFF)
option(ENABLE_PREFLIGHT "Enable preflight testing" ON)

# Isolated System Library (No external dependencies)
if(ENABLE_ISOLATED)
    add_library(obinexus_dop_isolated STATIC ${DOP_ISOLATED_SOURCES})
    target_link_libraries(obinexus_dop_isolated ${CMAKE_THREAD_LIBS_INIT})
    target_compile_definitions(obinexus_dop_isolated PRIVATE 
        -DSYSTEM_ISOLATED=1 
        -DCOMPONENT_TAG="isolated")
endif()

# Closed System Library (Limited internal dependencies)
if(ENABLE_CLOSED)
    add_library(obinexus_dop_closed STATIC ${DOP_CLOSED_SOURCES})
    if(ENABLE_ISOLATED)
        target_link_libraries(obinexus_dop_closed obinexus_dop_isolated)
    endif()
    target_compile_definitions(obinexus_dop_closed PRIVATE 
        -DSYSTEM_CLOSED=1 
        -DCOMPONENT_TAG="closed")
endif()

# Open System Library (Full CLI exposure)
if(ENABLE_OPEN)
    add_library(obinexus_dop_open STATIC ${DOP_OPEN_SOURCES})
    if(ENABLE_CLOSED)
        target_link_libraries(obinexus_dop_open obinexus_dop_closed)
    endif()
    if(ENABLE_ISOLATED)
        target_link_libraries(obinexus_dop_open obinexus_dop_isolated)
    endif()
    target_compile_definitions(obinexus_dop_open PRIVATE 
        -DSYSTEM_OPEN=1 
        -DCOMPONENT_TAG="open"
        -DCLI_EXPOSED=1)
endif()

# Taxonomy Testing Framework
enable_testing()

# Isolated System Tests (In-memory only, no external deps)
if(ENABLE_ISOLATED)
    add_executable(test_isolated tests/test_isolated.c)
    target_link_libraries(test_isolated obinexus_dop_isolated)
    target_compile_definitions(test_isolated PRIVATE -DTEST_ISOLATION_LEVEL=1)
    
    add_test(NAME isolated_preflight COMMAND test_isolated --preflight)
    add_test(NAME isolated_memory COMMAND test_isolated --memory-only)
    add_test(NAME isolated_integrity COMMAND test_isolated --integrity)
    
    if(ENABLE_STRESS_TESTING)
        add_test(NAME isolated_stress COMMAND test_isolated --stress)
    endif()
endif()

# Closed System Tests (Internal system validation)
if(ENABLE_CLOSED)
    add_executable(test_closed tests/test_closed.c)
    target_link_libraries(test_closed obinexus_dop_closed)
    if(ENABLE_ISOLATED)
        target_link_libraries(test_closed obinexus_dop_isolated)
    endif()
    target_compile_definitions(test_closed PRIVATE -DTEST_ISOLATION_LEVEL=2)
    
    add_test(NAME closed_topology COMMAND test_closed --topology)
    add_test(NAME closed_adapter COMMAND test_closed --adapter)
    add_test(NAME closed_governance COMMAND test_closed --governance)
    
    if(ENABLE_STRESS_TESTING)
        add_test(NAME closed_stress COMMAND test_closed --stress)
    endif()
endif()

# Open System Tests (Full CLI integration)
if(ENABLE_OPEN)
    add_executable(test_open tests/test_open.c)
    target_link_libraries(test_open obinexus_dop_open)
    if(ENABLE_CLOSED)
        target_link_libraries(test_open obinexus_dop_closed)
    endif()
    if(ENABLE_ISOLATED)
        target_link_libraries(test_open obinexus_dop_isolated)
    endif()
    target_compile_definitions(test_open PRIVATE -DTEST_ISOLATION_LEVEL=3)
    
    add_test(NAME open_cli COMMAND test_open --cli)
    add_test(NAME open_manifest COMMAND test_open --manifest)
    add_test(NAME open_integration COMMAND test_open --integration)
    
    if(ENABLE_STRESS_TESTING)
        add_test(NAME open_stress COMMAND test_open --stress)
    endif()
endif()

# Preflight Testing Suite
if(ENABLE_PREFLIGHT)
    add_executable(preflight_suite tests/preflight_suite.c)
    if(ENABLE_ISOLATED)
        target_link_libraries(preflight_suite obinexus_dop_isolated)
    endif()
    if(ENABLE_CLOSED)
        target_link_libraries(preflight_suite obinexus_dop_closed)
    endif()
    if(ENABLE_OPEN)
        target_link_libraries(preflight_suite obinexus_dop_open)
    endif()
    
    add_test(NAME preflight_all COMMAND preflight_suite --all)
    add_test(NAME preflight_memory_load COMMAND preflight_suite --memory-load)
    add_test(NAME preflight_component_verification COMMAND preflight_suite --verify-components)
endif()

# Clock Enhancement Test Integration
add_executable(clock_enhanced_test tests/clock_enhanced_test.c)
if(ENABLE_ISOLATED)
    target_link_libraries(clock_enhanced_test obinexus_dop_isolated)
endif()
target_compile_definitions(clock_enhanced_test PRIVATE 
    -DCLOCK_ENHANCED_TESTING=1
    -DPREFLIGHT_ENABLED=1)

add_test(NAME clock_taxonomy_test COMMAND clock_enhanced_test --taxonomy)
add_test(NAME clock_isolation_test COMMAND clock_enhanced_test --isolation)
add_test(NAME clock_preflight_test COMMAND clock_enhanced_test --preflight)

# Custom Taxonomy Testing Targets
add_custom_target(test_taxonomy_isolated
    COMMAND ${CMAKE_CTEST_COMMAND} -R "isolated_.*"
    COMMENT "Running isolated system taxonomy tests"
)

add_custom_target(test_taxonomy_closed
    COMMAND ${CMAKE_CTEST_COMMAND} -R "closed_.*"
    COMMENT "Running closed system taxonomy tests"
)

add_custom_target(test_taxonomy_open
    COMMAND ${CMAKE_CTEST_COMMAND} -R "open_.*"
    COMMENT "Running open system taxonomy tests"
)

add_custom_target(test_preflight_all
    COMMAND ${CMAKE_CTEST_COMMAND} -R "preflight_.*"
    COMMENT "Running all preflight tests"
)

add_custom_target(test_stress_all
    COMMAND ${CMAKE_CTEST_COMMAND} -R ".*_stress"
    COMMENT "Running all stress tests"
)

add_custom_target(test_clock_enhanced
    COMMAND ${CMAKE_CTEST_COMMAND} -R "clock_.*_test"
    COMMENT "Running enhanced clock taxonomy tests"
)

# Production Integration Target
add_custom_target(production_preflight
    COMMAND ${CMAKE_CURRENT_BINARY_DIR}/preflight_suite --production-ready
    COMMENT "Running production preflight validation"
)

# Stress Testing Configuration
if(ENABLE_STRESS_TESTING)
    add_custom_target(stress_test_production
        COMMAND ${CMAKE_CTEST_COMMAND} -R ".*_stress" --verbose
        COMMENT "Running production stress testing suite"
    )
endif()

# Installation Configuration
install(TARGETS 
    $<$<BOOL:${ENABLE_ISOLATED}>:obinexus_dop_isolated>
    $<$<BOOL:${ENABLE_CLOSED}>:obinexus_dop_closed>
    $<$<BOOL:${ENABLE_OPEN}>:obinexus_dop_open>
    LIBRARY DESTINATION lib
    ARCHIVE DESTINATION lib
)
