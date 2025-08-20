CC = gcc
CFLAGS = -Wall -Wextra -O2 -fPIC -std=c99 -D_POSIX_C_SOURCE=200809L -D_GNU_SOURCE
LDFLAGS = -shared
LIBS = -luuid -lm -lrt

# Library targets
LIBNAME = libstressfilterflash
STATIC_LIB = $(LIBNAME).a
SHARED_LIB = $(LIBNAME).so

# Source files
SOURCES = stress_filter_flash.c
OBJECTS = $(SOURCES:.c=.o)

# Binary targets
BINARIES = stressfilterflash idle stress_monitor

all: $(STATIC_LIB) $(SHARED_LIB) $(BINARIES)

# Static library (.a)
$(STATIC_LIB): $(OBJECTS)
	ar rcs $@ $^

# Shared library (.so)
$(SHARED_LIB): $(OBJECTS)
	$(CC) $(LDFLAGS) -o $@ $^ $(LIBS)

# Object files
%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

# Binaries
stressfilterflash: main_stress.c $(STATIC_LIB)
	$(CC) $(CFLAGS) -o $@ $< -L. -lstressfilterflash $(LIBS)

idle: main_idle.c $(STATIC_LIB)
	$(CC) $(CFLAGS) -o $@ $< -L. -lstressfilterflash $(LIBS)

stress_monitor: main_monitor.c $(STATIC_LIB)
	$(CC) $(CFLAGS) -o $@ $< -L. -lstressfilterflash $(LIBS)

install: $(SHARED_LIB) $(STATIC_LIB)
	cp $(SHARED_LIB) /usr/local/lib/
	cp $(STATIC_LIB) /usr/local/lib/
	cp stress_filter_flash.h /usr/local/include/
	ldconfig

clean:
	rm -f $(OBJECTS) $(STATIC_LIB) $(SHARED_LIB) $(BINARIES)

.PHONY: all clean install
