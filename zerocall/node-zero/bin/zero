#!/usr/bin/env node
/**
 * Zero Knowledge Proof CLI
 * 
 * Command-line interface for the Zero library
 * providing ID creation, verification, and ZKP operations.
 */
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createRequire } from 'module';

// Set up module paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Load configuration
import { ConfigProvider } from '../dist/esm/config/index.mjs';

// Initialize configuration
const configProvider = new ConfigProvider();
configProvider.getConfig().catch(err => {
  console.error('Configuration error:', err);
  process.exit(1);
});

// Load the CLI module
import('../dist/cli/cli.js').catch(err => {
  console.error('Failed to load the Zero CLI:', err);
  process.exit(1);
});
