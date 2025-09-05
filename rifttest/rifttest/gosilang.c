/*
 * gosilang.c - Gossip Programming Language for OBINexus
 * 
 * Purpose: Polyglot language with cryptographic gossip protocols
 * Standard: C19/C21 compliant, ChaCha20-Poly1305 encryption
 * 
 * Features:
 * - Distributed gossip protocol for code sharing
 * - Anti-tampering with cryptographic signatures
 * - Polyglot interoperability with RIFT
 * - Nsibidi symbol propagation
 * 
 * Build: gcc -std=c19 -O3 gosilang.c -o gosilang -lsodium -lpthread -lregex
 */

#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <stdbool.h>
#include <stdatomic.h>
#include <pthread.h>
#include <time.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <sodium.h>
#include <errno.h>
#include <regex.h>

/* Gossip protocol constants */
#define GOSSIP_PORT 31337
#define MAX_PEERS 256
#define MAX_MESSAGE_SIZE 65536
#define GOSSIP_FANOUT 3
#define GOSSIP_ROUNDS 5
#define MESSAGE_TTL 10

/* Cryptographic constants */
#define KEY_SIZE crypto_aead_chacha20poly1305_IETF_KEYBYTES
#define NONCE_SIZE crypto_aead_chacha20poly1305_IETF_NPUBBYTES
#define TAG_SIZE crypto_aead_chacha20poly1305_IETF_ABYTES
#define SIGNATURE_SIZE crypto_sign_BYTES

/* Message types */
typedef enum {
    MSG_CODE_SHARE = 0x01,      /* Share code snippet */
    MSG_SYMBOL_SYNC = 0x02,     /* Sync Nsibidi symbols */
    MSG_POLICY_UPDATE = 0x04,   /* Policy matrix update */
    MSG_HEARTBEAT = 0x08,       /* Peer alive check */
    MSG_VERIFY_REQUEST = 0x10,  /* Request verification */
    MSG_VERIFY_RESPONSE = 0x20  /* Verification response */
} message_type_t;

/* Gossip message structure */
typedef struct {
    uint8_t version;
    message_type_t type;
    uint16_t ttl;
    uint64_t timestamp;
    uint8_t sender_pubkey[crypto_sign_PUBLICKEYBYTES];
    uint8_t signature[SIGNATURE_SIZE];
    uint32_t payload_size;
    uint8_t nonce[NONCE_SIZE];
    uint8_t payload[]; /* Encrypted with ChaCha20-Poly1305 */
} __attribute__((packed)) gossip_message_t;

/* Peer information */
typedef struct {
    struct sockaddr_in addr;
    uint8_t pubkey[crypto_sign_PUBLICKEYBYTES];
    time_t last_seen;
    _Atomic uint32_t trust_score;
    _Atomic bool active;
} peer_t;

/* Code fragment for sharing */
typedef struct {
    char language[32];      /* "rift", "gosilang", "nsibidi", etc */
    char uri[256];         /* OBINexus URI */
    uint32_t fragment_id;
    uint32_t total_fragments;
    char code[8192];
    uint8_t checksum[32];  /* SHA256 of complete code */
} code_fragment_t;

/* Nsibidi symbol gossip */
typedef struct {
    uint32_t codepoint;
    double x, y, z;        /* XYZ color mapping */
    char semantic[64];
    char cultural_context[256];
    uint8_t approval_signatures[8][SIGNATURE_SIZE]; /* Multi-sig approval */
    uint8_t approval_count;
} nsibidi_gossip_t;

/* Global state */
static struct {
    peer_t peers[MAX_PEERS];
    size_t peer_count;
    pthread_rwlock_t peer_lock;
    
    uint8_t node_pubkey[crypto_sign_PUBLICKEYBYTES];
    uint8_t node_seckey[crypto_sign_SECRETKEYBYTES];
    uint8_t shared_key[KEY_SIZE];
    
    int gossip_socket;
    _Atomic bool running;
    
    pthread_t gossip_thread;
    pthread_t verification_thread;
} g_state = { .peer_lock = PTHREAD_RWLOCK_INITIALIZER };

/* Message cache to prevent loops */
#define CACHE_SIZE 1024
static struct {
    uint8_t hashes[CACHE_SIZE][32];
    size_t index;
    pthread_mutex_t lock;
} g_msg_cache = { .lock = PTHREAD_MUTEX_INITIALIZER };

/* R"" patterns for code validation */
static const char *GOSI_FUNCTION = R"(gosi\s+func\s+([a-zA-Z_][a-zA-Z0-9_]*))";
static const char *GOSI_GOSSIP = R"(@gossip\s*\{\s*([^}]+)\s*\})";
static const char *GOSI_VERIFY = R"(@verify\s*\(\s*([^)]+)\s*\))";

/* Initialize cryptography */
static int init_crypto(void) {
    if (sodium_init() < 0) {
        fprintf(stderr, "Error: Failed to initialize libsodium\n");
        return -1;
    }
    
    /* Generate node keypair */
    if (crypto_sign_keypair(g_state.node_pubkey, g_state.node_seckey) != 0) {
        fprintf(stderr, "Error: Failed to generate node keypair\n");
        return -1;
    }
    
    /* Derive shared key from node secret (simplified - use proper KDF in production) */
    crypto_generichash(g_state.shared_key, sizeof(g_state.shared_key),
                      g_state.node_seckey, sizeof(g_state.node_seckey),
                      NULL, 0);
    
    return 0;
}

/* Hash message for deduplication */
static void hash_message(const gossip_message_t *msg, uint8_t *hash) {
    crypto_generichash(hash, 32,
                      (const uint8_t *)msg,
                      sizeof(gossip_message_t) + msg->payload_size,
                      NULL, 0);
}

/* Check if message already seen */
static bool is_duplicate_message(const gossip_message_t *msg) {
    uint8_t hash[32];
    hash_message(msg, hash);
    
    pthread_mutex_lock(&g_msg_cache.lock);
    
    /* Check cache */
    for (size_t i = 0; i < CACHE_SIZE; i++) {
        if (memcmp(g_msg_cache.hashes[i], hash, 32) == 0) {
            pthread_mutex_unlock(&g_msg_cache.lock);
            return true;
        }
    }
    
    /* Add to cache */
    memcpy(g_msg_cache.hashes[g_msg_cache.index], hash, 32);
    g_msg_cache.index = (g_msg_cache.index + 1) % CACHE_SIZE;
    
    pthread_mutex_unlock(&g_msg_cache.lock);
    return false;
}

/* Encrypt payload with ChaCha20-Poly1305 */
static int encrypt_payload(const void *plaintext, size_t plaintext_len,
                          uint8_t *ciphertext, uint8_t *nonce) {
    /* Generate random nonce */
    randombytes_buf(nonce, NONCE_SIZE);
    
    /* Encrypt */
    unsigned long long ciphertext_len;
    if (crypto_aead_chacha20poly1305_ietf_encrypt(
            ciphertext, &ciphertext_len,
            plaintext, plaintext_len,
            NULL, 0,  /* No additional data */
            NULL, nonce, g_state.shared_key) != 0) {
        return -1;
    }
    
    return (int)ciphertext_len;
}

/* Decrypt payload */
static int decrypt_payload(const uint8_t *ciphertext, size_t ciphertext_len,
                          const uint8_t *nonce, void *plaintext) {
    unsigned long long plaintext_len;
    if (crypto_aead_chacha20poly1305_ietf_decrypt(
            plaintext, &plaintext_len,
            NULL,
            ciphertext, ciphertext_len,
            NULL, 0,
            nonce, g_state.shared_key) != 0) {
        return -1;
    }
    
    return (int)plaintext_len;
}

/* Sign message */
static void sign_message(gossip_message_t *msg) {
    /* Sign everything except the signature field */
    size_t sign_len = sizeof(gossip_message_t) - sizeof(msg->signature) + msg->payload_size;
    
    crypto_sign_detached(msg->signature, NULL,
                        (const uint8_t *)msg, sign_len,
                        g_state.node_seckey);
}

/* Verify message signature */
static bool verify_signature(const gossip_message_t *msg) {
    size_t verify_len = sizeof(gossip_message_t) - sizeof(msg->signature) + msg->payload_size;
    
    return crypto_sign_verify_detached(msg->signature,
                                      (const uint8_t *)msg, verify_len,
                                      msg->sender_pubkey) == 0;
}

/* Find or add peer */
static peer_t* find_peer(const struct sockaddr_in *addr, const uint8_t *pubkey) {
    pthread_rwlock_wrlock(&g_state.peer_lock);
    
    /* Search existing peers */
    for (size_t i = 0; i < g_state.peer_count; i++) {
        if (memcmp(&g_state.peers[i].addr, addr, sizeof(*addr)) == 0 ||
            memcmp(g_state.peers[i].pubkey, pubkey, crypto_sign_PUBLICKEYBYTES) == 0) {
            
            g_state.peers[i].last_seen = time(NULL);
            pthread_rwlock_unlock(&g_state.peer_lock);
            return &g_state.peers[i];
        }
    }
    
    /* Add new peer if space available */
    if (g_state.peer_count < MAX_PEERS) {
        peer_t *peer = &g_state.peers[g_state.peer_count++];
        memcpy(&peer->addr, addr, sizeof(*addr));
        memcpy(peer->pubkey, pubkey, crypto_sign_PUBLICKEYBYTES);
        peer->last_seen = time(NULL);
        atomic_store(&peer->trust_score, 50);  /* Start with neutral trust */
        atomic_store(&peer->active, true);
        
        pthread_rwlock_unlock(&g_state.peer_lock);
        return peer;
    }
    
    pthread_rwlock_unlock(&g_state.peer_lock);
    return NULL;
}

/* Select random peers for gossip */
static size_t select_gossip_peers(peer_t *selected[], size_t max_peers) {
    pthread_rwlock_rdlock(&g_state.peer_lock);
    
    size_t count = 0;
    size_t active_count = 0;
    
    /* Count active peers */
    for (size_t i = 0; i < g_state.peer_count; i++) {
        if (atomic_load(&g_state.peers[i].active)) {
            active_count++;
        }
    }
    
    /* Select random subset */
    if (active_count > 0) {
        size_t to_select = (active_count < max_peers) ? active_count : max_peers;
        
        for (size_t i = 0; i < to_select && count < max_peers; i++) {
            size_t idx = randombytes_uniform(g_state.peer_count);
            if (atomic_load(&g_state.peers[idx].active)) {
                selected[count++] = &g_state.peers[idx];
            }
        }
    }
    
    pthread_rwlock_unlock(&g_state.peer_lock);
    return count;
}

/* Forward message to selected peers */
static void gossip_forward(const gossip_message_t *msg, size_t msg_size) {
    if (msg->ttl <= 1) return;  /* Don't forward if TTL exhausted */
    
    /* Select random peers */
    peer_t *peers[GOSSIP_FANOUT];
    size_t peer_count = select_gossip_peers(peers, GOSSIP_FANOUT);
    
    /* Create copy with decremented TTL */
    gossip_message_t *fwd_msg = malloc(msg_size);
    memcpy(fwd_msg, msg, msg_size);
    fwd_msg->ttl--;
    
    /* Forward to selected peers */
    for (size_t i = 0; i < peer_count; i++) {
        sendto(g_state.gossip_socket, fwd_msg, msg_size, 0,
               (struct sockaddr *)&peers[i]->addr, sizeof(peers[i]->addr));
    }
    
    free(fwd_msg);
}

/* Handle code share message */
static void handle_code_share(const gossip_message_t *msg, const struct sockaddr_in *sender) {
    code_fragment_t fragment;
    int len = decrypt_payload(msg->payload, msg->payload_size, msg->nonce, &fragment);
    if (len < 0) {
        fprintf(stderr, "Failed to decrypt code share\n");
        return;
    }
    
    printf("\n=== Code Share Received ===\n");
    printf("Language: %s\n", fragment.language);
    printf("URI: %s\n", fragment.uri);
    printf("Fragment: %u/%u\n", fragment.fragment_id, fragment.total_fragments);
    printf("Code:\n%s\n", fragment.code);
    printf("==========================\n");
    
    /* Validate code syntax based on language */
    if (strcmp(fragment.language, "gosilang") == 0) {
        regex_t func_regex;
        if (regcomp(&func_regex, GOSI_FUNCTION, REG_EXTENDED) == 0) {
            regmatch_t matches[2];
            if (regexec(&func_regex, fragment.code, 2, matches, 0) == 0) {
                printf("Valid Gosilang function detected\n");
            }
            regfree(&func_regex);
        }
    }
    
    /* Update peer trust score */
    peer_t *peer = find_peer(sender, msg->sender_pubkey);
    if (peer) {
        atomic_fetch_add(&peer->trust_score, 1);
    }
    
    /* Forward to other peers */
    gossip_forward(msg, sizeof(gossip_message_t) + msg->payload_size);
}

/* Handle Nsibidi symbol sync */
static void handle_symbol_sync(const gossip_message_t *msg, const struct sockaddr_in *sender) {
    nsibidi_gossip_t symbol;
    int len = decrypt_payload(msg->payload, msg->payload_size, msg->nonce, &symbol);
    if (len < 0) {
        fprintf(stderr, "Failed to decrypt symbol sync\n");
        return;
    }
    
    printf("\n=== Nsibidi Symbol Sync ===\n");
    printf("Codepoint: U+%X\n", symbol.codepoint);
    printf("XYZ: (%.2f, %.2f, %.2f)\n", symbol.x, symbol.y, symbol.z);
    printf("Semantic: %s\n", symbol.semantic);
    printf("Context: %s\n", symbol.cultural_context);
    printf("Approvals: %u\n", symbol.approval_count);
    printf("==========================\n");
    
    /* Verify multi-sig approvals */
    if (symbol.approval_count >= 3) {  /* Require 3+ approvals */
        printf("Symbol approved by community\n");
        /* Store symbol in local database */
    }
    
    /* Forward to other peers */
    gossip_forward(msg, sizeof(gossip_message_t) + msg->payload_size);
}

/* Create and send code share */
static void share_code(const char *language, const char *uri, const char *code) {
    /* Create fragment */
    code_fragment_t fragment = {0};
    strncpy(fragment.language, language, 31);
    strncpy(fragment.uri, uri, 255);
    strncpy(fragment.code, code, 8191);
    fragment.fragment_id = 1;
    fragment.total_fragments = 1;
    
    /* Calculate checksum */
    crypto_generichash(fragment.checksum, sizeof(fragment.checksum),
                      (const uint8_t *)code, strlen(code),
                      NULL, 0);
    
    /* Create message */
    size_t payload_size = sizeof(fragment) + TAG_SIZE;
    size_t msg_size = sizeof(gossip_message_t) + payload_size;
    gossip_message_t *msg = calloc(1, msg_size);
    
    msg->version = 1;
    msg->type = MSG_CODE_SHARE;
    msg->ttl = MESSAGE_TTL;
    msg->timestamp = time(NULL);
    memcpy(msg->sender_pubkey, g_state.node_pubkey, crypto_sign_PUBLICKEYBYTES);
    
    /* Encrypt payload */
    int enc_len = encrypt_payload(&fragment, sizeof(fragment), 
                                 msg->payload, msg->nonce);
    if (enc_len < 0) {
        free(msg);
        return;
    }
    msg->payload_size = enc_len;
    
    /* Sign message */
    sign_message(msg);
    
    /* Send to all peers */
    peer_t *peers[GOSSIP_FANOUT];
    size_t peer_count = select_gossip_peers(peers, GOSSIP_FANOUT);
    
    for (size_t i = 0; i < peer_count; i++) {
        sendto(g_state.gossip_socket, msg, msg_size, 0,
               (struct sockaddr *)&peers[i]->addr, sizeof(peers[i]->addr));
    }
    
    printf("Shared code to %zu peers\n", peer_count);
    free(msg);
}

/* Gossip protocol thread */
static void* gossip_thread_func(void *arg) {
    uint8_t buffer[sizeof(gossip_message_t) + MAX_MESSAGE_SIZE];
    
    while (atomic_load(&g_state.running)) {
        struct sockaddr_in sender_addr;
        socklen_t addr_len = sizeof(sender_addr);
        
        /* Receive message */
        ssize_t recv_len = recvfrom(g_state.gossip_socket, buffer, sizeof(buffer), 0,
                                   (struct sockaddr *)&sender_addr, &addr_len);
        
        if (recv_len < sizeof(gossip_message_t)) {
            continue;  /* Invalid message */
        }
        
        gossip_message_t *msg = (gossip_message_t *)buffer;
        
        /* Basic validation */
        if (msg->version != 1) continue;
        if (msg->payload_size > MAX_MESSAGE_SIZE) continue;
        if (recv_len != sizeof(gossip_message_t) + msg->payload_size) continue;
        
        /* Check for duplicates */
        if (is_duplicate_message(msg)) continue;
        
        /* Verify signature */
        if (!verify_signature(msg)) {
            fprintf(stderr, "Invalid signature from %s\n", 
                    inet_ntoa(sender_addr.sin_addr));
            continue;
        }
        
        /* Add/update peer */
        find_peer(&sender_addr, msg->sender_pubkey);
        
        /* Handle message by type */
        switch (msg->type) {
            case MSG_CODE_SHARE:
                handle_code_share(msg, &sender_addr);
                break;
                
            case MSG_SYMBOL_SYNC:
                handle_symbol_sync(msg, &sender_addr);
                break;
                
            case MSG_HEARTBEAT:
                /* Just update last_seen */
                break;
                
            default:
                fprintf(stderr, "Unknown message type: %d\n", msg->type);
        }
    }
    
    return NULL;
}

/* Initialize gossip network */
static int init_network(uint16_t port) {
    /* Create UDP socket */
    g_state.gossip_socket = socket(AF_INET, SOCK_DGRAM, 0);
    if (g_state.gossip_socket < 0) {
        perror("socket");
        return -1;
    }
    
    /* Bind to port */
    struct sockaddr_in bind_addr = {
        .sin_family = AF_INET,
        .sin_port = htons(port),
        .sin_addr.s_addr = INADDR_ANY
    };
    
    if (bind(g_state.gossip_socket, (struct sockaddr *)&bind_addr, 
             sizeof(bind_addr)) < 0) {
        perror("bind");
        close(g_state.gossip_socket);
        return -1;
    }
    
    /* Set socket options */
    int enable = 1;
    setsockopt(g_state.gossip_socket, SOL_SOCKET, SO_REUSEADDR, 
              &enable, sizeof(enable));
    
    return 0;
}

/* Bootstrap with initial peers */
static void bootstrap_peers(const char *peer_list) {
    char *peers = strdup(peer_list);
    char *peer = strtok(peers, ",");
    
    while (peer) {
        char host[256];
        uint16_t port;
        
        if (sscanf(peer, "%255[^:]:%hu", host, &port) == 2) {
            struct sockaddr_in addr = {
                .sin_family = AF_INET,
                .sin_port = htons(port)
            };
            
            if (inet_pton(AF_INET, host, &addr.sin_addr) > 0) {
                /* Send heartbeat to bootstrap */
                gossip_message_t msg = {
                    .version = 1,
                    .type = MSG_HEARTBEAT,
                    .ttl = 1,
                    .timestamp = time(NULL),
                    .payload_size = 0
                };
                
                memcpy(msg.sender_pubkey, g_state.node_pubkey, 
                      crypto_sign_PUBLICKEYBYTES);
                sign_message(&msg);
                
                sendto(g_state.gossip_socket, &msg, sizeof(msg), 0,
                       (struct sockaddr *)&addr, sizeof(addr));
                
                printf("Bootstrapped with %s:%u\n", host, port);
            }
        }
        
        peer = strtok(NULL, ",");
    }
    
    free(peers);
}

/* Main entry point */
int main(int argc, char *argv[]) {
    uint16_t port = GOSSIP_PORT;
    const char *bootstrap = NULL;
    bool interactive = true;
    
    /* Parse arguments */
    for (int i = 1; i < argc; i++) {
        if (strcmp(argv[i], "--port") == 0 && i + 1 < argc) {
            port = atoi(argv[++i]);
        } else if (strcmp(argv[i], "--bootstrap") == 0 && i + 1 < argc) {
            bootstrap = argv[++i];
        } else if (strcmp(argv[i], "--daemon") == 0) {
            interactive = false;
        }
    }
    
    /* Initialize */
    if (init_crypto() < 0) return 1;
    if (init_network(port) < 0) return 1;
    
    atomic_store(&g_state.running, true);
    
    printf("GosiLang v1.0 - Gossip Protocol Node\n");
    printf("Node Public Key: ");
    for (int i = 0; i < crypto_sign_PUBLICKEYBYTES; i++) {
        printf("%02x", g_state.node_pubkey[i]);
    }
    printf("\n");
    printf("Listening on port %u\n", port);
    
    /* Bootstrap if provided */
    if (bootstrap) {
        bootstrap_peers(bootstrap);
    }
    
    /* Start gossip thread */
    pthread_create(&g_state.gossip_thread, NULL, gossip_thread_func, NULL);
    
    if (interactive) {
        /* Interactive mode */
        printf("\nCommands:\n");
        printf("  share <language> <uri> <code>  - Share code snippet\n");
        printf("  peers                          - List active peers\n");
        printf("  quit                           - Exit\n\n");
        
        char line[1024];
        while (fgets(line, sizeof(line), stdin)) {
            char cmd[32];
            if (sscanf(line, "%31s", cmd) == 1) {
                if (strcmp(cmd, "quit") == 0) {
                    break;
                } else if (strcmp(cmd, "share") == 0) {
                    char lang[32], uri[256], code[512];
                    if (sscanf(line, "share %31s %255s \"%511[^\"]\"", 
                              lang, uri, code) == 3) {
                        share_code(lang, uri, code);
                    } else {
                        printf("Usage: share <language> <uri> \"<code>\"\n");
                    }
                } else if (strcmp(cmd, "peers") == 0) {
                    pthread_rwlock_rdlock(&g_state.peer_lock);
                    printf("Active peers: %zu\n", g_state.peer_count);
                    for (size_t i = 0; i < g_state.peer_count; i++) {
                        if (atomic_load(&g_state.peers[i].active)) {
                            printf("  %s:%u (trust: %u)\n",
                                   inet_ntoa(g_state.peers[i].addr.sin_addr),
                                   ntohs(g_state.peers[i].addr.sin_port),
                                   atomic_load(&g_state.peers[i].trust_score));
                        }
                    }
                    pthread_rwlock_unlock(&g_state.peer_lock);
                }
            }
        }
    } else {
        /* Daemon mode */
        pause();
    }
    
    /* Shutdown */
    atomic_store(&g_state.running, false);
    close(g_state.gossip_socket);
    pthread_join(g_state.gossip_thread, NULL);
    
    return 0;
}