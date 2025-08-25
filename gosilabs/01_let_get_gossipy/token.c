

## token.h - Complete Token Definitions
```c
#ifndef TOKEN_H
#define TOKEN_H

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// Token Types - Complete Gosilang Grammar
typedef enum {
    // Operators & Delimiters
    TOKEN_BANG = 256,      // !
    TOKEN_HASH,            // #
    TOKEN_ASSIGN,          // :=
    TOKEN_EQUAL,           // =
    TOKEN_ARROW,           // ->
    TOKEN_LPAREN,          // (
    TOKEN_RPAREN,          // )
    TOKEN_LT,              // <
    TOKEN_GT,              // >
    TOKEN_LBRACKET,        // [
    TOKEN_RBRACKET,        // ]
    TOKEN_LBRACE,          // {
    TOKEN_RBRACE,          // }
    TOKEN_COMMA,           // ,
    TOKEN_COLON,           // :
    TOKEN_SEMICOLON,       // ;
    TOKEN_DOT_DOT,         // ..
    
    // Keywords
    TOKEN_DEF,             // #def
    TOKEN_BIND,            // #bind
    TOKEN_UNBIND,          // #unbind
    TOKEN_SPAN,            // span
    TOKEN_RANGE,           // range
    TOKEN_VEC,             // vec
    TOKEN_NIL,             // nil
    TOKEN_NULL,            // null
    TOKEN_LET,             // let
    
    // Literals & Identifiers
    TOKEN_IDENTIFIER,      // [A-Za-z_][A-Za-z0-9_]*
    TOKEN_INTEGER,         // [0-9]+
    TOKEN_FLOAT,           // [0-9]+\.[0-9]+
    
    // Special
    TOKEN_EOF,
    TOKEN_UNKNOWN,
    TOKEN_NEWLINE
} TokenType;

// Position tracking
typedef struct {
    int line;
    int column;
    int offset;
} Position;

// Token structure with position
typedef struct {
    TokenType type;
    char *lexeme;
    Position pos;
    union {
        int int_val;
        double float_val;
    } value;
} Token;

// Token list for pipeline
typedef struct {
    Token *tokens;
    size_t count;
    size_t capacity;
} TokenList;

// Function declarations
const char* token_type_name(TokenType type);
Token create_token(TokenType type, const char *lexeme, Position pos);
void token_list_init(TokenList *list);
void token_list_add(TokenList *list, Token token);
void token_list_free(TokenList *list);
void print_token_json(const Token *token);
void print_token_table(const Token *token);

#endif // TOKEN_H
```

## lexer.l - Complete Flex Specification
```lex
%{
#include "token.h"
#include <stdlib.h>
#include <string.h>

// Global position tracking
Position current_pos = {1, 1, 0};
TokenList global_tokens;

void update_position() {
    for (int i = 0; yytext[i]; i++) {
        if (yytext[i] == '\n') {
            current_pos.line++;
            current_pos.column = 1;
        } else {
            current_pos.column++;
        }
        current_pos.offset++;
    }
}

Token make_token(TokenType type) {
    Position start_pos = current_pos;
    Token token = create_token(type, yytext, start_pos);
    update_position();
    return token;
}

Token make_int_token() {
    Token token = make_token(TOKEN_INTEGER);
    token.value.int_val = atoi(yytext);
    return token;
}

Token make_float_token() {
    Token token = make_token(TOKEN_FLOAT);
    token.value.float_val = atof(yytext);
    return token;
}
%}

%option noyywrap
%option yylineno

/* Pattern Definitions */
DIGIT       [0-9]
ALPHA       [A-Za-z_]
ALNUM       [A-Za-z0-9_]
WHITESPACE  [ \t\r]
NEWLINE     \n

%%

    /* Compound Operators (match first to avoid conflicts) */
":="            { return make_token(TOKEN_ASSIGN).type; }
"->"            { return make_token(TOKEN_ARROW).type; }
".."            { return make_token(TOKEN_DOT_DOT).type; }

    /* Keywords - Must come before identifiers */
"#def"          { return make_token(TOKEN_DEF).type; }
"#bind"         { return make_token(TOKEN_BIND).type; }
"#unbind"       { return make_token(TOKEN_UNBIND).type; }
"span"          { return make_token(TOKEN_SPAN).type; }
"range"         { return make_token(TOKEN_RANGE).type; }
"vec"           { return make_token(TOKEN_VEC).type; }
"nil"           { return make_token(TOKEN_NIL).type; }
"null"          { return make_token(TOKEN_NULL).type; }
"let"           { return make_token(TOKEN_LET).type; }

    /* Single Character Operators */
"!"             { return make_token(TOKEN_BANG).type; }
"#"             { return make_token(TOKEN_HASH).type; }
"="             { return make_token(TOKEN_EQUAL).type; }
"("             { return make_token(TOKEN_LPAREN).type; }
")"             { return make_token(TOKEN_RPAREN).type; }
"<"             { return make_token(TOKEN_LT).type; }
">"             { return make_token(TOKEN_GT).type; }
"["             { return make_token(TOKEN_LBRACKET).type; }
"]"             { return make_token(TOKEN_RBRACKET).type; }
"{"             { return make_token(TOKEN_LBRACE).type; }
"}"             { return make_token(TOKEN_RBRACE).type; }
","             { return make_token(TOKEN_COMMA).type; }
":"             { return make_token(TOKEN_COLON).type; }
";"             { return make_token(TOKEN_SEMICOLON).type; }

    /* Numbers */
{DIGIT}+\.{DIGIT}+  { return make_float_token().type; }
{DIGIT}+            { return make_int_token().type; }

    /* Identifiers */
{ALPHA}{ALNUM}*     { return make_token(TOKEN_IDENTIFIER).type; }

    /* Whitespace */
{WHITESPACE}+       { update_position(); /* skip */ }
{NEWLINE}           { return make_token(TOKEN_NEWLINE).type; }

    /* Unknown characters */
.                   { return make_token(TOKEN_UNKNOWN).type; }

%%

/* Store tokens for pipeline access */
int lex_and_store() {
    int token_type;
    token_list_init(&global_tokens);
    
    while ((token_type = yylex()) != 0) {
        // Token already stored via make_token calls
        Token token = create_token(token_type, yytext, current_pos);
        token_list_add(&global_tokens, token);
        
        if (token_type == TOKEN_EOF) break;
    }
    
    return global_tokens.count;
}
