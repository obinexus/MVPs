# DIARAM Assembly Integration Plan
## 📋 DIARAM Assembly Integration: Technical Milestones

### **Milestone 1: NASM Pipeline Architecture** (Week 1-2)
**Objective**: Establish NASM-based assembly module compilation pipeline

**Deliverables**:
```
1. nasm_pipeline.c - Core pipeline orchestrator
2. opcode_registry.h - Opcode/operand type definitions  
3. smod_loader.c - S-Module dynamic loading mechanism
4. diram.drc extension for assembly configuration:
   [assembly]
   nasm_flags=-f elf64 -g -F dwarf
   opcode_validation=strict
   smod_path=~/.diram/smods/
   repl_assembly_mode=true
```

**Technical Tasks**:
- Implement `diram_nasm_compile()` function for .s → .o compilation
- Create `opcode_t` structure with safety level metadata
- Design POSIX-compliant S-Module registration system
- Extend REPL parser for assembly mnemonics

### **Milestone 2: Opcode Safety Framework** (Week 3-4)
**Objective**: Implement warning level validation (0-12 scale)

**Deliverables**:
```c
// opcode_safety.h
typedef struct {
    uint8_t level;           // 0-12 warning scale
    uint32_t opcode_hash;    // SHA256 truncated
    char mnemonic[16];       // MOV, ADD, XOR etc
    uint64_t exec_count;     // Telemetry
} opcode_safety_t;

// Implementation of validation function
int opcode_validate_level(opcode_t* op, 
                         diram_context_t* ctx);
```

**Integration Points**:
- Hook into existing SHA-256 receipt system
- Extend telemetry_level=2 for opcode-bound tracking
- Memory audit trail enhancement for assembly operations

### **Milestone 3: S-Module Runtime Integration** (Week 5-6)
**Objective**: Enable .s modules as first-class DIARAM memory operations

**Core Components**:
```
src/
├── assembly/
│   ├── smod_runtime.c      # S-Module executor
│   ├── operand_resolver.c  # Prefix system implementation
│   └── memory_bridge.c     # DIARAM ↔ Assembly bridge
```

**Operand Prefix System**:
```
# → Global space (maps to memory_space config)
@ → Runtime-bound memory (heap allocations)
% → REPL-local symbol table
& → Temporary operand buffer (stack-local)
```

**REPL Enhancement**:
```
diram> load example.s
S-Module loaded: example (3 opcodes registered)
diram> exec MOV #global_buffer, #1024
Allocated 1024 bytes at 0x7f5c9c8c1010
  Opcode: MOV (safety level: 2)
  SHA-256: a3b4c5d6...
  Receipt: SMOD_EXEC_001
```

### **Milestone 4: Detached Memory Artifacts** (Week 7-8)
**Objective**: POSIX-style memory persistence for assembly operations

**Architecture**:
```
~/.diram/
├── smods/              # S-Module registry
│   ├── manifest.json   # Module metadata
│   └── compiled/       # .so artifacts
├── receipts/           # Cryptographic proofs
└── memory_maps/        # Detached memory regions
```

**Key Functions**:
- `diram_detach_memory()` - Convert allocation to persistent artifact
- `diram_reattach_artifact()` - Restore memory from artifact
- `smod_persist_state()` - Save S-Module execution context

### **Milestone 5: Demo & Validation Suite** (Week 9-10)
**Objective**: Comprehensive demonstration and test framework

**Demo Components**:
1. **basic_opcodes.s** - Fundamental operations showcase
2. **memory_arithmetic.s** - Complex allocation patterns
3. **safety_levels.s** - Warning system demonstration
4. **integration_test.c** - Full pipeline validation

**Test Matrix**:
```makefile
test-assembly: test-nasm test-smods test-safety test-detach
	@echo "Assembly integration tests complete"

test-nasm:
	$(CC) -o test_nasm tests/assembly/test_nasm.c
	./test_nasm

test-smods:
	./diram --test-smod tests/assembly/*.s
```

## 🎯 Integration Checkpoints

**CP1**: NASM compilation working with simple .s files  
**CP2**: Opcode safety levels enforced in REPL  
**CP3**: S-Module hot-loading functional  
**CP4**: Memory artifacts persisting across sessions  
**CP5**: Full demo suite passing all tests  

## 🔧 Configuration Extensions

Add to `diram.drc`:
```ini
[assembly]
enable_assembly_mode=true
nasm_path=/usr/bin/nasm
ld_path=/usr/bin/ld
smod_auto_load=true
opcode_telemetry=true
safety_enforcement=strict

[smod_registry]
registry_path=~/.diram/smods/
max_loaded_modules=32
module_cache_size=16MB
```

