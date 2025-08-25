#ifndef TOKEN_H
#define TOKEN_H

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// OBINexus Gosilang Token Definitions
// Medical device compliant token system
// #hacc #noghosting #sorrynotsorry

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

// Position tracking for medical device compliance
typedef struct {
    int line;
    int column;
    int offset;
} Position;

// Token structure with position and value
typedef struct {
    TokenType type;
    char *lexeme;
    Position pos;
    union {
        int int_val;
        double float_val;
    } value;
} Token;

// Token list for pipeline processing
typedef struct {
    Token *tokens;
    size_t count;
    size_t capacity;
} TokenList;

// YYSTYPE for flex/bison integration
typedef union {
    int num;
    double float_num;
    char *str;
} YYSTYPE;

extern YYSTYPE yylval;

// Function declarations
const char* token_type_name(TokenType type);
Token create_token(TokenType type, const char *lexeme, Position pos);
void token_list_init(TokenList *list);
void token_list_add(TokenList *list, Token token);
void token_list_free(TokenList *list);
void print_token_json(const Token *token);
void print_token_table(const Token *token);

// External declarations for lexer integration
extern TokenList global_tokens;
extern int lex_and_store();

#endif // TOKEN_H
