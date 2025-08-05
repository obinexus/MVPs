#!/usr/bin/env node
/**
 * scripts/create-bin.js
 * 
 * Creates the Zero CLI binary script and sets appropriate permissions.
 * Handles cross-platform permission elevation using PermissionElevator.
 */

// Import Node.js modules
const fs = require('fs').promises
const path = require('path')
const { fileURLToPath } = require('url')
const { createRequire }  = require('module')

// Import the PermissionElevator utility
const { PermissionElevator } = require('./PermissionElevator.cjs');
const fsSync = require('fs');

/**
 * Ensures the bin directory exists
 * @returns {Promise<string>} Path to the bin directory
 */
async function createBinDir() {
  const binDir = path.resolve(__dirname, '..', 'bin');
  try {
    await fs.mkdir(binDir, { recursive: true });
    console.log('✅ Created bin directory');
    return binDir;
  } 
  catch (error) {
    console.error('❌ Failed to create bin directory:', error);
    throw error;
  }
}

/**
 * Creates the bin script content
 * @returns {string} The content for the bin script
 */
function generateBinContent() {
  return `#!/usr/bin/env node
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
`;
}

/**
 * Creates the main bin script and sets permissions
 * @param {string} binDir - Path to the bin directory
 * @returns {Promise<string>} Path to the created bin script
 */
async function createBinScript(binDir) {
  const binPath = path.join(binDir, 'zero.js');
  const binContent = generateBinContent();
  
  try {
    await fs.writeFile(binPath, binContent, 'utf8');
    console.log(`✅ Created bin script at ${binPath}`);
    
    // Set permissions using PermissionElevator
    const permissionResult = await PermissionElevator.makeExecutable(binPath, {
      verbose: true,
      useAdmin: false  // First try without admin, if it fails will retry with admin
    });
    
    if (!permissionResult) {
      console.log('🔄 Retrying with elevated permissions...');
      const elevatedResult = await PermissionElevator.makeExecutable(binPath, {
        verbose: true,
        useAdmin: true
      });
      
      if (!elevatedResult) {
        throw new Error('Failed to set executable permissions');
      }
    }
    
    console.log(`🔑 Set executable permissions on ${binPath}`);
    return binPath;
  } catch (error) {
    console.error('❌ Failed to create bin script:', error);
    throw error;
  }
}

/**
 * Creates a symbolic link for global usage (Unix systems only)
 * @param {string} binPath - Path to the bin script
 * @returns {Promise<void>}
 */
async function createSymlink(binPath) {
  // Skip on Windows
  if (process.platform === 'win32') {
    console.log('ℹ️ Skipping symlink creation on Windows');
    return;
  }
  
  const symlinkPath = path.resolve(__dirname, '..', 'bin', 'zero');
  
  try {
    // Check if symlink already exists
    try {
      await fs.unlink(symlinkPath);
      console.log('🔄 Removed existing symlink');
    } catch (err) {
      // Ignore error if symlink doesn't exist
    }
    
    await fs.symlink(binPath, symlinkPath, 'file');
    console.log(`🔗 Created symlink at ${symlinkPath}`);
    
    // Set permissions on the symlink
    await PermissionElevator.makeExecutable(symlinkPath, { verbose: true });
    
    console.log(`🔑 Set executable permissions on ${symlinkPath}`)
  } catch (error) {
    console.error('❌ Failed to create symlink:', error);
    // Continue execution, this is not critical
  }
}

/**
 * Verifies that the distribution files exist
 * @returns {Promise<boolean>} True if dist files exist
 */
async function verifyDistFiles() {
  const cliEntryPath = path.resolve(__dirname, '..', 'dist', 'cli', 'cli.js');
  const configPath = path.resolve(__dirname, '..', 'dist', 'esm', 'config', 'index.mjs');
  
  try {
    await fs.access(cliEntryPath);
    await fs.access(configPath);
    
    console.log('✅ Verified distribution files');
    return true;
  } catch (error) {
    console.error('❌ Distribution files not found. Please build the project first.');
    console.error(`Missing file: ${error.path}`);
    return false;
  }
}

/**
 * Updates package.json bin field if needed
 * @returns {Promise<void>}
 */
async function updatePackageJson() {
  const packageJsonPath = path.resolve(__dirname, '..', 'package.json');
  
  try {
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonContent);
    
    // Check if bin field needs updating
    const binField = packageJson.bin || {};
    const expectedBinPath = './bin/zero.js';
    
    if (binField.zero !== expectedBinPath) {
      // Update bin field
      packageJson.bin = {
        ...binField,
        zero: expectedBinPath
      };
      
      await fs.writeFile(
        packageJsonPath,
        JSON.stringify(packageJson, null, 2),
        'utf8'
      );
      console.log('✅ Updated package.json bin field');
    }

  } catch (error) {
    console.warn('⚠️ Failed to update package.json (non-critical):', error.message);
  }
}

/**
 * Main function to create and set up the bin script
 */
async function main() {
  try {
    console.log('🚀 Creating Zero CLI bin script...');
    
    // Check if dist files exist
    if (!(await verifyDistFiles())) {
      process.exit(1);
    }
    
    // Create bin directory and script
    const binDir = await createBinDir();
    const binPath = await createBinScript(binDir);
    
    // Create symlink (Unix only)
    await createSymlink(binPath);
    
    // Update package.json
    await updatePackageJson();
    
    console.log('✨ Bin script created successfully!');
  } catch (error) {
    console.error('❌ Failed to create bin script:', error);
    process.exit(1);
  }
}

// Run the main function
main();