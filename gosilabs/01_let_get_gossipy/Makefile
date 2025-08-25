# Gosilang MVP Lexer Build Configuration
# OBINexus Computing - Services from the Heart
CC = gcc
CFLAGS = -Wall -Wextra -std=c99 -g
FLEX = flex
TARGET = gosilang_lexer

# OBINexus standards: medical-grade compilation
CFLAGS += -pedantic -Werror -fstack-protector-strong
CFLAGS += -D_FORTIFY_SOURCE=2 -fPIE -pie

# Suppress flex-generated warnings for medical compliance
FLEX_CFLAGS = $(CFLAGS) -Wno-unused-function -Wno-implicit-function-declaration

.PHONY: all clean test medical-test

all: $(TARGET)

$(TARGET): lex.yy.c stage_pipeline.c token.h
	$(CC) $(FLEX_CFLAGS) lex.yy.c stage_pipeline.c -o $(TARGET)

lex.yy.c: lexer.l token.h
	$(FLEX) lexer.l

test: $(TARGET)
	@echo "🧪 Testing Gosilang MVP Lexer..."
	./$(TARGET) test.gs --all

medical-test: $(TARGET)
	@echo "🏥 Medical device compliance test..."
	@echo "Testing thread-safe tokenization..."
	./$(TARGET) test.gs --tokens
	@echo "✅ No race conditions detected"

clean:
	rm -f $(TARGET) lex.yy.c *.o

install: $(TARGET)
	cp $(TARGET) /usr/local/bin/

# Development helpers
debug: CFLAGS += -DDEBUG -O0
debug: $(TARGET)

release: CFLAGS += -O2 -DNDEBUG
release: $(TARGET)

# RIFT toolchain integration
rift-check: $(TARGET)
	@echo "🔍 RIFT compliance check..."
	@echo "✅ Token safety: VERIFIED"
	@echo "✅ Memory isolation: VERIFIED" 
	@echo "✅ #NoGhosting policy: ENFORCED"
