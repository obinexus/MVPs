// nexus_link_semserver_x.h
// OBINexus Computing - Semantic Resolution Server Extended
// Version: 1.0.0-alpha

#ifndef NEXUS_LINK_SEMSERVER_X_H
#define NEXUS_LINK_SEMSERVER_X_H

#include <stdint.h>
#include <stdbool.h>
#include <pthread.h>

// ============================================================================
// Nexus-Link SemServer-X: Distributed Semantic Component Resolution Engine
// ============================================================================

// Core architectural principles:
// 1. Trie-based component resolution for O(log n) lookup performance
// 2. Semantic versioning with hot-swap capability support
// 3. Fault-tolerant dependency resolution with fallback strategies
// 4. Cryptographic verification of component integrity
// 5. Distributed consensus for version compatibility negotiation

// Component Resolution Strategy Types
typedef enum {
    RESOLUTION_EXACT_MATCH,       // Require exact version match
    RESOLUTION_COMPATIBLE,        // Accept compatible versions (semver rules)
    RESOLUTION_LATEST_STABLE,     // Always use latest stable version
    RESOLUTION_EXPERIMENTAL,      // Allow experimental/preview versions
    RESOLUTION_FALLBACK_CHAIN     // Use fallback chain if primary fails
} resolution_strategy_t;

// Component Source Types (Ship of Theseus principle)
typedef enum {
    SOURCE_OBINEXUS_DIRECT,      // Direct OBINexus repository
    SOURCE_VENDOR_CERTIFIED,     // Third-party certified vendors
    SOURCE_COMMUNITY_CONTRIB,    // Community contributions
    SOURCE_LOCAL_CACHE,          // Local component cache
    SOURCE_NEXUS_MINION,         // Nexus-Search compliant minion nodes
    SOURCE_FEDERATED_NETWORK     // Federated component network
} component_source_t;

// Semantic Version Extended (SemVer-X) Structure
typedef struct {
    uint32_t major;              // Breaking changes
    uint32_t minor;              // New features (backward compatible)
    uint32_t patch;              // Bug fixes
    uint32_t hotfix;             // Hot-swappable emergency fixes
    
    // Extended metadata for governance
    char prerelease[64];         // Alpha, beta, rc identifiers
    char build_metadata[128];    // Build-specific metadata
    char governance_tag[32];     // Governance compliance tag
    
    // Hot-swap capabilities
    bool is_hot_swappable;       // Can replace without restart
    bool requires_quiesce;       // Needs traffic quiescing
    uint32_t swap_duration_ms;   // Expected swap duration
    
    // Compatibility matrix
    uint64_t abi_signature;      // ABI compatibility signature
    uint32_t protocol_version;   // Wire protocol version
    char dependency_hash[65];    // SHA-256 of dependency tree
} semantic_version_x_t;

// Component Manifest for Hot-Swappable Packages
typedef struct {
    char component_id[128];      // Unique component identifier
    char component_name[256];    // Human-readable name
    semantic_version_x_t version; // Extended semantic version
    
    // Component classification
    char taxonomy_class[64];     // Taxonomy classification
    uint32_t isolation_tier;     // 0: Isolated, 1: Closed, 2: Open
    
    // Dependencies and requirements
    struct {
        char dependency_id[128];
        semantic_version_x_t min_version;
        semantic_version_x_t max_version;
        bool is_optional;
        resolution_strategy_t strategy;
    } dependencies[32];
    uint32_t dependency_count;
    
    // Runtime characteristics
    struct {
        uint64_t memory_footprint;    // Expected memory usage
        uint32_t cpu_cores_required;  // CPU core requirements
        bool requires_gpu;            // GPU acceleration needed
        uint32_t network_bandwidth;   // Network bandwidth (Mbps)
    } runtime_requirements;
    
    // Fault tolerance specifications
    struct {
        uint32_t mtbf_hours;          // Mean time between failures
        uint32_t recovery_time_ms;    // Recovery time objective
        uint32_t redundancy_factor;   // Redundancy requirements
        bool supports_graceful_degradation;
        char fallback_component[128]; // Fallback component ID
    } fault_tolerance;
    
    // Cryptographic verification
    char manifest_signature[512];     // RSA-PSS signature
    char component_checksum[65];      // SHA-256 checksum
    uint64_t timestamp;               // Manifest generation time
} component_manifest_t;

// Trie Node for Component Resolution
typedef struct trie_node {
    char character;
    bool is_end_of_component;
    component_manifest_t* manifest;
    struct trie_node* children[256];  // ASCII character set
    pthread_rwlock_t lock;            // Read-write lock for node
} trie_node_t;

// Nexus-Link Resolution Context
typedef struct {
    trie_node_t* component_trie;      // Root of component trie
    
    // Resolution configuration
    resolution_strategy_t default_strategy;
    component_source_t preferred_sources[8];
    uint32_t source_priority_count;
    
    // Fault tolerance configuration
    uint32_t max_retry_attempts;
    uint32_t retry_backoff_ms;
    bool enable_circuit_breaker;
    uint32_t circuit_breaker_threshold;
    
    // Performance metrics
    struct {
        uint64_t total_resolutions;
        uint64_t successful_resolutions;
        uint64_t failed_resolutions;
        uint64_t fallback_resolutions;
        uint64_t hot_swaps_performed;
        double average_resolution_time_ms;
    } metrics;
    
    // Governance integration
    void* governance_validator;       // RiftGov validator reference
    bool enforce_governance_rules;
    char governance_policy[256];
    
    pthread_mutex_t context_mutex;
} nexus_resolution_context_t;

// ============================================================================
// Core API Functions
// ============================================================================

// Initialize Nexus-Link SemServer-X
nexus_resolution_context_t* nexus_link_init(
    const char* config_path,
    resolution_strategy_t default_strategy
);

// Component Resolution Functions
component_manifest_t* nexus_resolve_component(
    nexus_resolution_context_t* ctx,
    const char* component_id,
    semantic_version_x_t* requested_version,
    resolution_strategy_t strategy
);

// Hot-swap Operations
typedef enum {
    SWAP_SUCCESS,
    SWAP_FAILED_VALIDATION,
    SWAP_FAILED_DEPENDENCY,
    SWAP_FAILED_RUNTIME,
    SWAP_FAILED_ROLLBACK
} swap_result_t;

swap_result_t nexus_hot_swap_component(
    nexus_resolution_context_t* ctx,
    const char* component_id,
    semantic_version_x_t* old_version,
    semantic_version_x_t* new_version,
    bool force_swap
);

// Semantic Version Comparison
int nexus_compare_versions(
    const semantic_version_x_t* v1,
    const semantic_version_x_t* v2
);

bool nexus_version_compatible(
    const semantic_version_x_t* required,
    const semantic_version_x_t* provided,
    resolution_strategy_t strategy
);

// Fault Tolerance Functions
typedef struct {
    component_manifest_t* primary;
    component_manifest_t* fallback;
    uint32_t failover_count;
    uint64_t last_failover_time;
} fault_tolerant_component_t;

fault_tolerant_component_t* nexus_create_fault_tolerant(
    nexus_resolution_context_t* ctx,
    const char* primary_id,
    const char* fallback_id
);

// Component Registration and Discovery
int nexus_register_component(
    nexus_resolution_context_t* ctx,
    component_manifest_t* manifest,
    component_source_t source
);

// Trie-based Search Functions
typedef struct {
    component_manifest_t** results;
    uint32_t result_count;
    uint32_t max_results;
} search_results_t;

search_results_t* nexus_search_components(
    nexus_resolution_context_t* ctx,
    const char* prefix,
    const char* taxonomy_filter,
    uint32_t max_results
);

// ============================================================================
// Extended Fault Tolerance Framework
// ============================================================================

// Circuit Breaker for Component Resolution
typedef enum {
    CIRCUIT_CLOSED,    // Normal operation
    CIRCUIT_OPEN,      // Failing, reject requests
    CIRCUIT_HALF_OPEN  // Testing recovery
} circuit_state_t;

typedef struct {
    char component_id[128];
    circuit_state_t state;
    uint32_t failure_count;
    uint32_t success_count;
    uint64_t last_failure_time;
    uint64_t next_retry_time;
    pthread_mutex_t breaker_mutex;
} circuit_breaker_t;

// Health Check Framework
typedef enum {
    HEALTH_HEALTHY,
    HEALTH_DEGRADED,
    HEALTH_UNHEALTHY,
    HEALTH_UNKNOWN
} health_status_t;

typedef struct {
    health_status_t (*check_function)(void* component);
    uint32_t check_interval_ms;
    uint32_t timeout_ms;
    uint64_t last_check_time;
    health_status_t last_status;
} health_check_config_t;

// Implement health monitoring for hot-swappable components
health_status_t nexus_check_component_health(
    nexus_resolution_context_t* ctx,
    const char* component_id,
    health_check_config_t* config
);

// ============================================================================
// Ship of Theseus Implementation
// ============================================================================

// Component Evolution Tracking
typedef struct {
    char original_component_id[128];
    semantic_version_x_t original_version;
    
    // Evolution history
    struct {
        semantic_version_x_t from_version;
        semantic_version_x_t to_version;
        uint64_t swap_timestamp;
        char reason[256];
        bool was_automatic;
    } evolution_history[64];
    uint32_t evolution_count;
    
    // Current state
    semantic_version_x_t current_version;
    uint32_t total_swaps;
    double uptime_percentage;
    
    // Governance tracking
    bool maintains_original_contract;
    char contract_hash[65];
} component_evolution_t;

// Track component evolution over time
component_evolution_t* nexus_track_evolution(
    nexus_resolution_context_t* ctx,
    const char* component_id
);

// Validate component maintains original contract despite evolution
bool nexus_validate_evolved_contract(
    component_evolution_t* evolution,
    const char* original_contract_hash
);

#endif // NEXUS_LINK_SEMSERVER_X_H
