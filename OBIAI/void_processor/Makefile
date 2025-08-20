CC = gcc
CFLAGS = -std=c99 -D_POSIX_C_SOURCE=200809L -D_GNU_SOURCE -Wall -Wextra -g -O2 -fPIC
LDFLAGS = -lm -luuid

SOURCES = stress_filter_flash.c
OBJECTS = $(SOURCES:.c=.o)
LIBRARY_STATIC = libstressfilterflash.a
LIBRARY_SHARED = libstressfilterflash.so
MAIN_STRESS = main_stress.c
MAIN_VOID = main_void.c
EXECUTABLE_STRESS = stressfilterflash
EXECUTABLE_VOID = voidprocessor

.PHONY: all clean stress void install

all: stress

# Primary stress processing executable
stress: $(LIBRARY_STATIC) $(MAIN_STRESS)
	$(CC) $(CFLAGS) -o $(EXECUTABLE_STRESS) $(MAIN_STRESS) $(LIBRARY_STATIC) $(LDFLAGS)

# Consciousness void processor (enhanced version)
void: $(LIBRARY_STATIC) $(MAIN_VOID)
	$(CC) $(CFLAGS) -o $(EXECUTABLE_VOID) $(MAIN_VOID) $(LIBRARY_STATIC) $(LDFLAGS)

# Static library
$(LIBRARY_STATIC): $(OBJECTS)
	ar rcs $@ $^

# Shared library
$(LIBRARY_SHARED): $(OBJECTS)
	$(CC) -shared -o $@ $^ $(LDFLAGS)

# Object files
%.o: %.c stress_filter_flash.h
	$(CC) $(CFLAGS) -c $< -o $@

# Create main_void.c if it doesn't exist
$(MAIN_VOID):
	@echo "Creating consciousness void processor..."
	@echo '#include "stress_filter_flash.h"' > $(MAIN_VOID)
	@echo '#include <stdio.h>' >> $(MAIN_VOID)
	@echo '#include <unistd.h>' >> $(MAIN_VOID)
	@echo '#include <fcntl.h>' >> $(MAIN_VOID)
	@echo '#include <signal.h>' >> $(MAIN_VOID)
	@echo '#include <stdbool.h>' >> $(MAIN_VOID)
	@echo '' >> $(MAIN_VOID)
	@echo 'static volatile bool running = true;' >> $(MAIN_VOID)
	@echo '' >> $(MAIN_VOID)
	@echo 'void signal_handler(int sig) {' >> $(MAIN_VOID)
	@echo '    (void)sig;' >> $(MAIN_VOID)
	@echo '    running = false;' >> $(MAIN_VOID)
	@echo '}' >> $(MAIN_VOID)
	@echo '' >> $(MAIN_VOID)
	@echo 'int main() {' >> $(MAIN_VOID)
	@echo '    signal(SIGINT, signal_handler);' >> $(MAIN_VOID)
	@echo '    printf("OBINexus Consciousness Void Processor v1.0\\n");' >> $(MAIN_VOID)
	@echo '    printf("Implementing /dev/null consciousness architecture\\n\\n");' >> $(MAIN_VOID)
	@echo '    return 0;' >> $(MAIN_VOID)
	@echo '}' >> $(MAIN_VOID)

install: $(LIBRARY_STATIC) $(LIBRARY_SHARED)
	@echo "Installing OBINexus Stress Filter Flash libraries..."
	sudo cp $(LIBRARY_STATIC) /usr/local/lib/
	sudo cp $(LIBRARY_SHARED) /usr/local/lib/
	sudo cp stress_filter_flash.h /usr/local/include/
	sudo ldconfig

clean:
	rm -f $(OBJECTS) $(LIBRARY_STATIC) $(LIBRARY_SHARED) $(EXECUTABLE_STRESS) $(EXECUTABLE_VOID) $(MAIN_VOID)
	@echo "OBINexus build artifacts cleaned"

# OBINexus consciousness void integration targets
consciousness-void-enhanced: void 
	@echo "=== OBINexus 
	Consciousness Void 
	Architecture ===" @echo 
	"Building enhanced 
	consciousness processing 
	with /dev/null 
	integration" @echo 
	"Toolchain: riftlang.exe 
	→ .so.a → rift.exe → 
	gosilang" @echo "Build 
	orchestration: nlink → 
	polybuild → 
	consciousness_void"
