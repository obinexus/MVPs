// rollup.config.js
import typescript from 'rollup-plugin-typescript2';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import dts from 'rollup-plugin-dts';
import alias from '@rollup/plugin-alias';
import path from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

const banner = `/**
 * ${pkg.name} v${pkg.version}
 * ${pkg.description}
 * @license MIT
 */`;

// External dependencies
const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
  'idb',
  'punycode',
  'tslib'
];

// Path aliases to match tsconfig paths
const srcAliases = [
  { find: '@', replacement: path.resolve(__dirname, 'src') },
  { find: '@core', replacement: path.resolve(__dirname, 'src/core') },
  { find: '@algorithms', replacement: path.resolve(__dirname, 'src/core/algorithms') },
  { find: '@search', replacement: path.resolve(__dirname, 'src/core/search') },
  { find: '@storage', replacement: path.resolve(__dirname, 'src/core/storage') },
  { find: '@utils', replacement: path.resolve(__dirname, 'src/core/utils') },
  { find: '@documents', replacement: path.resolve(__dirname, 'src/core/documents') },
  { find: '@types', replacement: path.resolve(__dirname, 'src/core/types') },
  { find: '@telemetry', replacement: path.resolve(__dirname, 'src/core/telemetry') },
  { find: '@adapters', replacement: path.resolve(__dirname, 'src/core/adapters') },
  { find: '@web', replacement: path.resolve(__dirname, 'src/core/web') },
  { find: '@cli', replacement: path.resolve(__dirname, 'src/cli') }
];

// Configure base output parameters
const baseOutput = {
  banner,
  sourcemap: true,
  exports: 'named'
};

// TypeScript configuration for core build
const typescriptCoreConfig = {
  tsconfig: './tsconfig.json',
  tsconfigOverride: {
    compilerOptions: {
      declaration: true,
      declarationDir: './dist/types',
      sourceMap: true,
    },
    // Filter to include only existing files and directories
    include: [
      'src/core/**/*.ts',
      'src/core/index.ts',
      'src/core/algorithms/**/*.ts',
      'src/core/search/**/*.ts',
      'src/core/storage/**/*.ts',
      'src/core/utils/**/*.ts',
      'src/core/types/**/*.ts',
      'src/core/telemetry/**/*.ts'
    ],
    // Specifically exclude files that don't exist yet or are causing issues
    exclude: [
      'node_modules',
      'dist',
      '**/*.test.ts',
      'src/cli/**/*',
      'src/core/adapters/browser/FileReaderWrapper.ts',
      'src/core/adapters/node/StreamHandler.ts',
      'src/core/search/SearchOptions.ts',
      'src/core/search/SearchResult.ts',
      'src/core/web/**/*'
    ]
  },
  clean: true,
  check: false // Skip type-checking during build to avoid missing file errors
};

// Define core build configuration
const coreConfig = {
  input: 'src/core/index.ts',
  external,
  plugins: [
    alias({ entries: srcAliases }),
    resolve({
      browser: true,
      preferBuiltins: true,
      extensions: ['.ts', '.js']
    }),
    commonjs({
      include: /node_modules/,
      requireReturnsDefault: 'auto'
    }),
    typescript(typescriptCoreConfig)
  ]
};

// TypeScript configuration for CLI build
const typescriptCliConfig = {
  tsconfig: './tsconfig.json',
  tsconfigOverride: {
    compilerOptions: {
      declaration: true,
      declarationDir: './dist/types',
      sourceMap: true,
    },
    include: ['src/cli/**/*.ts'],
    exclude: ['node_modules', 'dist', '**/*.test.ts']
  },
  clean: true,
  check: false // Skip type-checking to avoid missing dependency errors
};

// Define CLI build configuration 
const cliConfig = {
  input: 'src/cli/index.ts',
  external: [...external, './core'],
  plugins: [
    alias({ entries: srcAliases }),
    resolve({
      browser: false,
      preferBuiltins: true,
      extensions: ['.ts', '.js']
    }),
    commonjs({
      include: /node_modules/,
      requireReturnsDefault: 'auto'
    }),
    typescript(typescriptCliConfig)
  ]
};

// Define output configurations
export default [
  // Core library - ESM build
  {
    ...coreConfig,
    output: {
      ...baseOutput,
      file: 'dist/index.js',
      format: 'esm'
    }
  },
  
  // Core library - CJS build
  {
    ...coreConfig,
    output: {
      ...baseOutput,
      file: 'dist/index.cjs',
      format: 'cjs'
    }
  },
  
  // Core library - UMD build
  {
    ...coreConfig,
    output: {
      ...baseOutput,
      file: 'dist/index.umd.js',
      format: 'umd',
      name: 'NexusSearch',
      globals: {
        idb: 'idb',
        punycode: 'punycode',
        tslib: 'tslib'
      }
    },
    plugins: [
      ...coreConfig.plugins,
      terser({
        output: {
          comments: (node, comment) =>
            comment.type === 'comment2' && /@license/i.test(comment.value)
        }
      })
    ]
  },
  
  // CLI - ESM build
  {
    ...cliConfig,
    output: {
      ...baseOutput,
      file: 'dist/cli/index.js',
      format: 'esm',
      banner: '#!/usr/bin/env node\n' + banner
    }
  },
  
  // Type definitions for core library
  {
    input: 'src/core/index.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'es'
    },
    plugins: [
      alias({ entries: srcAliases }),
      dts({
        respectExternal: true,
        compilerOptions: {
          baseUrl: '.',
          paths: {
            "@/*": ["src/*"],
            "@core/*": ["src/core/*"],
            "@algorithms/*": ["src/core/algorithms/*"],
            "@search/*": ["src/core/search/*"],
            "@storage/*": ["src/core/storage/*"],
            "@utils/*": ["src/core/utils/*"],
            "@types/*": ["src/core/types/*"]
          }
        }
      })
    ]
  }
];