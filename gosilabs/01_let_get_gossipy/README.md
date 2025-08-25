# Gosilang MVP Lexer

## Features
✅ Complete token recognition for Gosilang grammar  
✅ Position tracking (line, column, offset)  
✅ Stage-bounce pipeline inspection  
✅ JSON and table output formats  
✅ Medical-device grade compilation flags  
✅ Zero race conditions (pure lexical analysis)  

## Build & Run
```bash
make                     # Build lexer
./gosilang_lexer test.gs # Run full pipeline
./gosilang_lexer test.gs --tokens  # Tokens only
```

## Token Types Supported
- **Operators**: `!`, `#`, `:=`, `=`, `->`, `()`, `<>`, `[]`, `{}`, `,`, `:`, `;`, `..`
- **Keywords**: `#def`, `#bind`, `#unbind`, `span`, `range`, `vec`, `nil`, `null`, `let`
- **Literals**: integers, floats, identifiers
- **Position**: every token tagged with line:column

## Output Formats
```bash
# Table format (human readable)
┌─────────────┬─────────────────┬─────────┬────────────┐
│ Token Type  │ Lexeme          │ Pos     │ Value Type │
├─────────────┼─────────────────┼─────────┼────────────┤
│ BANG        │ !               │ 1:1     │ string     │
│ VEC         │ vec             │ 1:2     │ string     │

# JSON format (machine readable)
{
  "tokens": [
    {
      "type": "BANG",
      "lexeme": "!",
      "position": {"line": 1, "column": 1, "offset": 0}
    }
  ]
}
```

## Compliance
- **NASA Power of Ten**: ✅ Medical device ready
- **Thread Safety**: ✅ Pure functional lexing
- **Memory Safety**: ✅ Proper cleanup, no leaks
- **Error Handling**: ✅ Unknown tokens flagged

Ready for Phase 2: Parser integration with RIFT toolchain.

**#hacc #noghosting #sorrynotsorry**
