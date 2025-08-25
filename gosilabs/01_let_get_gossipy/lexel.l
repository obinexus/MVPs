%{
#define _GNU_SOURCE
#define _DEFAULT_SOURCE
#include "token.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

// Global position tracking for OBINexus compliance
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

// Store tokens for pipeline access - #sorrynotsorry for global state
void store_current_token(TokenType type) {
    Token token;
    if (type == TOKEN_INTEGER) {
        token = make_int_token();
    } else if (type == TOKEN_FLOAT) {
        token = make_float_token();
    } else {
        token = make_token(type);
    }
    token_list_add(&global_tokens, token);
}
%}

%option nounput
%option noinput
%option noyywrap

/* Pattern Definitions - Gosilang Grammar */
DIGIT       [0-9]
ALPHA       [A-Za-z_]
ALNUM       [A-Za-z0-9_]
WHITESPACE  [ \t\r]
NEWLINE     \n

%%

    /* Compound Operators (match first to avoid conflicts) */
":="            { store_current_token(TOKEN_ASSIGN); return TOKEN_ASSIGN; }
"->"            { store_current_token(TOKEN_ARROW); return TOKEN_ARROW; }
".."            { store_current_token(TOKEN_DOT_DOT); return TOKEN_DOT_DOT; }

    /* Keywords - Must come before identifiers */
"#def"          { store_current_token(TOKEN_DEF); return TOKEN_DEF; }
"#bind"         { store_current_token(TOKEN_BIND); return TOKEN_BIND; }
"#unbind"       { store_current_token(TOKEN_UNBIND); return TOKEN_UNBIND; }
"span"          { store_current_token(TOKEN_SPAN); return TOKEN_SPAN; }
"range"         { store_current_token(TOKEN_RANGE); return TOKEN_RANGE; }
"vec"           { store_current_token(TOKEN_VEC); return TOKEN_VEC; }
"nil"           { store_current_token(TOKEN_NIL); return TOKEN_NIL; }
"null"          { store_current_token(TOKEN_NULL); return TOKEN_NULL; }
"let"           { store_current_token(TOKEN_LET); return TOKEN_LET; }

    /* Single Character Operators */
"!"             { store_current_token(TOKEN_BANG); return TOKEN_BANG; }
"#"             { store_current_token(TOKEN_HASH); return TOKEN_HASH; }
"="             { store_current_token(TOKEN_EQUAL); return TOKEN_EQUAL; }
"("             { store_current_token(TOKEN_LPAREN); return TOKEN_LPAREN; }
")"             { store_current_token(TOKEN_RPAREN); return TOKEN_RPAREN; }
"<"             { store_current_token(TOKEN_LT); return TOKEN_LT; }
">"             { store_current_token(TOKEN_GT); return TOKEN_GT; }
"["             { store_current_token(TOKEN_LBRACKET); return TOKEN_LBRACKET; }
"]"             { store_current_token(TOKEN_RBRACKET); return TOKEN_RBRACKET; }
"{"             { store_current_token(TOKEN_LBRACE); return TOKEN_LBRACE; }
"}"             { store_current_token(TOKEN_RBRACE); return TOKEN_RBRACE; }
","             { store_current_token(TOKEN_COMMA); return TOKEN_COMMA; }
":"             { store_current_token(TOKEN_COLON); return TOKEN_COLON; }
";"             { store_current_token(TOKEN_SEMICOLON); return TOKEN_SEMICOLON; }

    /* Numbers */
{DIGIT}+\.{DIGIT}+  { store_current_token(TOKEN_FLOAT); return TOKEN_FLOAT; }
{DIGIT}+            { store_current_token(TOKEN_INTEGER); return TOKEN_INTEGER; }

    /* Identifiers */
{ALPHA}{ALNUM}*     { store_current_token(TOKEN_IDENTIFIER); return TOKEN_IDENTIFIER; }

    /* Whitespace */
{WHITESPACE}+       { update_position(); /* skip */ }
{NEWLINE}           { store_current_token(TOKEN_NEWLINE); return TOKEN_NEWLINE; }

    /* Comments - C++ style */
"//".*              { update_position(); /* skip comments */ }

    /* Unknown characters */
.                   { store_current_token(TOKEN_UNKNOWN); return TOKEN_UNKNOWN; }

%%

/* Store tokens for pipeline access */
int lex_and_store() {
    int token_type;
    token_list_init(&global_tokens);
    
    while ((token_type = yylex()) != 0) {
        if (token_type == TOKEN_EOF) break;
    }
    
    return global_tokens.count;
}
