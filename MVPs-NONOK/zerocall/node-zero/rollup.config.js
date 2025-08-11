import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import alias from '@rollup/plugin-alias';
import path from 'path';
import { fileURLToPath } from 'url';
import {glob} from 'glob';
import copy from 'rollup-plugin-copy';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// External dependencies that shouldn't be bundled
const external = [
  'crypto',
  'path',
  'fs',
  'fs/promises',
  'url',
  'util',
  'chalk',
  'commander',
  'inquirer',
  'ora',
  'table'
];

// Path aliases from tsconfig.json
const pathAliases = {
  '@': path.resolve(__dirname, 'src'),
  '@cli': path.resolve(__dirname, 'src/cli'),
  '@utils': path.resolve(__dirname, 'src/utils'),
  '@context': path.resolve(__dirname, 'src/context'),
  '@crypto': path.resolve(__dirname, 'src/crypto'),
  '@encoding': path.resolve(__dirname, 'src/encoding'),
  '@errors': path.resolve(__dirname, 'src/errors'),
  '@types': path.resolve(__dirname, 'src/types'),
  '@config': path.resolve(__dirname, 'src/config'),
};

// Common plugins configuration - MOVED BEFORE FIRST USAGE
const createPlugins = (format, declarations = true) => [
  alias({
    entries: Object.entries(pathAliases).map(([find, replacement]) => ({
      find,
      replacement
    }))
  }),
  resolve({
    preferBuiltins: true,
    extensions: ['.ts', '.js', '.json']
  }),
  commonjs(),
  json(),
  typescript({
    tsconfig: './tsconfig.json',
    sourceMap: true,
    declaration: declarations,
    declarationDir: declarations ? `dist/${format}/types` : undefined,
    outDir: null,
    compilerOptions: {
      module: format === 'cjs' ? 'CommonJS' : 'ESNext',
      moduleResolution: 'node'
    }
  })
];

// Check for format from environment variable
const format = process.env.FORMAT || 'esm';
let config;

// ESM build configuration
if (format === 'esm') {
  config = {
    input: {
      'index': 'src/index.ts',
      'config/index': 'src/config/index.ts'
    },
    output: {
      dir: 'dist/esm',
      format: 'es',
      sourcemap: true,
      preserveModules: true,
      preserveModulesRoot: 'src',
      entryFileNames: '[name].mjs'
    },
    external,
    plugins: createPlugins('esm')
  };
}

// Copy configuration files to dist/config
const copyConfigFiles = copy({
  targets: [
    { src: 'zero.config.json', dest: 'dist/config' }
  ],
  verbose: true
});

// Create the plugins array and add copyConfigFiles
const plugins = createPlugins(format);
plugins.push(copyConfigFiles);

// Find all TypeScript files recursively
function getAllSourceFiles() {
  const files = glob.sync('src/**/*.ts');
  return files;
}

// CJS build configuration
if (format === 'cjs') {
  config = {
    input: 'src/index.ts',
    output: {
      dir: 'dist/cjs',
      format: 'cjs',
      sourcemap: true,
      preserveModules: true,
      preserveModulesRoot: 'src',
      exports: 'named',
      // Add .cjs extension for CommonJS files
      entryFileNames: '[name].cjs'
    },
    external,
    plugins: createPlugins('cjs')
  };
}

// CLI build configuration
if (format === 'cli') {
  // Use multiple entry points to build all CLI-related files
  const cliEntries = {
    'cli': 'src/cli/cli.ts',
    'cli/index': 'src/cli/index.ts',
    'cli/commands/index': 'src/cli/commands/index.ts',
    'cli/utils/index': 'src/cli/utils/index.ts',
    'cli/handlers/index': 'src/cli/handlers/index.ts',
    'cli/types/index': 'src/cli/types/index.ts'
  };
  
  // Add all command files
  glob.sync('src/cli/commands/*.ts').forEach(file => {
    const baseName = path.basename(file, '.ts');
    if (baseName !== 'index') {
      cliEntries[`cli/commands/${baseName}`] = file;
    }
  });
  
  config = {
    input: cliEntries,
    output: {
      dir: 'dist/cli',
      format: 'es',
      sourcemap: true,
      entryFileNames: '[name].js',
      chunkFileNames: 'chunks/[name]-[hash].js',
      banner: '#!/usr/bin/env node'
    },
    external,
    plugins: createPlugins('cli', false)
  };
}

export default config;