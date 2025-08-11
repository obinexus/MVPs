# DIRAM Root Makefile - Build Orchestrator
# OBINexus Aegis Project

# Default target
all: build

# Include configuration only
include Makefile.config

# Build targets delegated to modules
build:
	@$(MAKE) -f Makefile.core core
	@$(MAKE) -f Makefile.hotwire hotwire
	@$(MAKE) -f Makefile.cli cli

core:
	@$(MAKE) -f Makefile.core core

hotwire:
	@$(MAKE) -f Makefile.hotwire hotwire

cli:
	@$(MAKE) -f Makefile.cli cli

# Clean delegated to modules
clean:
	@$(MAKE) -f Makefile.core clean
	@$(MAKE) -f Makefile.hotwire clean
	@$(MAKE) -f Makefile.cli clean

# Other targets
install:
	@$(MAKE) -f Makefile.shared install

test:
	@$(MAKE) -f Makefile.shared test

help:
	@$(MAKE) -f Makefile.shared help

.PHONY: all build core hotwire cli clean install test help