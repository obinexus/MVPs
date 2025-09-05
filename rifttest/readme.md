# RIFTEST - OBINexus QA Testing Framework

## Overview
RIFTEST is the constitutional guardian of the RIFT ecosystem, ensuring every compilation pass respects human rights and governance principles. Written in C19/C21, it implements a single-pass, thread-safe QA harness that validates code against OBINexus legal frameworks.

## Constitutional Compliance Matrix

| Article | Protection | Implementation |
|---------|------------|----------------|
| Article 8 | Right to private/family life | Regex scanning for PII (SSN, NI, passport) |
| Article 3 | Freedom from degrading treatment | Content filtering for harmful language |
| Housing Act 1996 §202 | Review rights on failure | Automatic review trigger on QA_ZONE_CRIT |
| #NoGhosting | Audit trail requirement | AuraSeal cryptographic signatures |

## Architecture

### Error Zones (Compile-Time Enforced)
```
0-3   OK     → Proceed (green path)
4-6   WARN   → Log + continue (yellow path)
7-9   CRIT   → Block + escalate (orange path)
10-12 PANIC  → Immediate rollback (red path)
```

### Thread Model
- **4 Worker Threads**: Pinned to CPU cores 0-3
- **Lock-Free Ring Buffer**: O(1) logging with 4096 entry capacity
- **Atomic Counters**: Thread-safe error tracking
- **CPU Affinity**: Using `sched_setaffinity` for deterministic performance

### Nsibidi Symbol Integration
Test vectors for cultural preservation:
- **Love Symbol** (󳴧): XYZ(0.83, 0.65, 0.42) - warm emotional tones
- **Judgement Symbol** (󳴨): XYZ(0.91, 0.70, 0.55) - authority/wisdom tones

### JSON Telemetry Schema
```json
{
  "uri": "riftest.qa.obinexus.polyglot.protocol.uk.obinexus",
  "stage": 4,
  "nlm": { "x": 0.83, "y": 0.65, "z": 0.42 },
  "entropy_checksum": "sha3-256:...",
  "aura_seal": "ed25519:...",
  "constitutional_violations": [],
  "qa_bound": "OK|WARN|CRIT|PANIC",
  "telemetry_event": {
    "ok_count": 0,
    "warn_count": 0,
    "crit_count": 0,
    "panic_count": 0
  }
}
```

## Build Instructions
```bash
# Standard build
gcc -std=c19 -O3 riftest.c -o riftest -lregex -lcrypto -lpthread

# Debug build with sanitizers
gcc -std=c19 -g -fsanitize=thread -fsanitize=undefined \
    riftest.c -o riftest-debug -lregex -lcrypto -lpthread

# Production build with LTO
gcc -std=c19 -O3 -flto -march=native \
    riftest.c -o riftest-prod -lregex -lcrypto -lpthread
```

## Usage Examples

### Basic Test Run
```bash
./riftest --stage 4 --vector LOVE_SYMBOL --policy housing-rights
```

### Testing Judgement Symbol with Stage 7
```bash
./riftest --stage 7 --vector JUDGE_SYMBOL --policy housing-rights
```

### Integration with RIFT Pipeline
```bash
# Compile RIFT code and validate
./rift.exe compile app.rift -o app.so.a
./riftest --stage 4 --vector LOVE_SYMBOL --policy housing-rights | \
  ./riftraf --seal --policy obinexus.json
```

## Performance Characteristics
- **Load Time**: <10ms initialization
- **Per-Test Overhead**: <1ms
- **Memory Usage**: 8MB baseline (ring buffer + threads)
- **CPU Usage**: 4 threads at ~5% each during active testing

## Security Model
1. **AuraSeal Protocol**: Ed25519 signatures on all test results
2. **SHA3-256 Checksums**: Entropy validation for deterministic replay
3. **No External Dependencies**: Beyond libregex, libcrypto, libpthread
4. **Single-Pass Compilation**: No recursion, no dynamic allocation in hot paths

## Integration Points

### Input from rift.exe
- Receives compiled bytecode for validation
- Checks performance benchmarks (<200ms load time)
- Validates AST optimization levels

### Output to riftraf
- JSON telemetry via stdout
- Error codes via exit status
- Audit logs via stderr (worker threads)

### Coordination with riftsh
- Can be invoked as subprocess
- Supports batch testing mode
- Integrates with CI/CD pipelines

## Compliance Verification

### NASA Power of Ten Rules
✓ No recursion
✓ Fixed upper bounds on loops
✓ No dynamic memory after init
✓ Short functions (<60 lines)
✓ Minimal preprocessor use
✓ Restricted pointer use
✓ Compile with all warnings
✓ Daily static analysis
✓ Comprehensive test coverage
✓ Minimal assertion density

### OBINexus Governance
- Dual-gate validation ready (Foundation + Aspirational)
- HITL/HOTL oversight hooks via JSON telemetry
- Stakeholder consensus via error zone thresholds
- Self-healing via automatic rollback on PANIC

## Future Extensions
1. **Quantum-Resistant Upgrades**: Replace Ed25519 with post-quantum signatures
2. **ML-Based Anomaly Detection**: Train on telemetry patterns
3. **Distributed Testing**: Shard tests across multiple nodes
4. **Real-Time Dashboards**: WebSocket streaming of telemetry

## Support
For Housing Act 1996 §202 review triggers, contact:
- Technical: riftest-support@obinexus.org
- Legal: constitutional-compliance@obinexus.org
- Emergency: +44-OBINEXUS-PANIC (24/7)

---
*"Every token is a breath. One pass, no recursion. Governance is care."*