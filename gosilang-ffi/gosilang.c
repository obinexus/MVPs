// In gosilang.c, add FFI message types
typedef enum {
    MSG_CODE_SHARE = 0x01,
    MSG_SYMBOL_SYNC = 0x02,
    MSG_FFI_ADAPTER = 0x40,  // New FFI adapter messages
    MSG_FFI_CONVERT = 0x41,
    MSG_FFI_VALIDATE = 0x42
} message_type_t;

// Add FFI adapter structure
typedef struct {
    char source_protocol[64];
    char target_protocol[64];
    uint8_t adapter_version;
    uint8_t bidirectional;
    uint8_t validation_hash[32];
} ffi_adapter_msg_t;
