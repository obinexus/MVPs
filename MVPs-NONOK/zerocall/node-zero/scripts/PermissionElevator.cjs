#!/usr/bin/env node
/**
 * PermissionElevator.js
 * 
 * A comprehensive cross-platform utility for elevating file permissions.
 * Handles Windows, macOS, and Linux environments with appropriate elevation methods.
 * 
 * Usage:
 *   const { PermissionElevator } = require('./PermissionElevator');
 *   PermissionElevator.elevatePermissions('/path/to/file', { verbose: true });
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * Utility class to elevate file permissions across different platforms
 * Supports Windows, macOS, and Linux
 */
class PermissionElevator {
  /**
   * Elevate file permissions
   * @param {string} filePath - Path to the file to modify
   * @param {object} options - Additional configuration options
   * @param {boolean} options.verbose - Whether to show detailed output (default: false)
   * @param {boolean} options.stopOnError - Whether to stop on first error (default: true)
   * @param {string[]} options.extraPermissions - Additional chmod parameters for Unix systems (default: [])
   * @param {boolean} options.recursive - Whether to apply permissions recursively (default: false)
   * @param {boolean} options.useAdmin - Whether to try admin-level permissions (default: true)
   */
  static elevatePermissions(filePath, options = {}) {
    // Set default options
    const config = {
      verbose: false,
      stopOnError: true,
      extraPermissions: [],
      recursive: false,
      useAdmin: true,
      ...options
    };

    // Validate file path
    if (!fs.existsSync(filePath)) {
      this.logError(`File not found at ${filePath}`, new Error('File not found'), config.verbose);
      return false;
    }

    try {
      // Determine platform-specific permission elevation method
      switch (process.platform) {
        case 'win32':
          return this.windowsElevatePermissions(filePath, config);
        case 'darwin':
          return this.macOSElevatePermissions(filePath, config);
        case 'linux':
        case 'freebsd':
        case 'openbsd':
          return this.linuxElevatePermissions(filePath, config);
        default:
          throw new Error(`Unsupported platform: ${process.platform}`);
      }
    } catch (error) {
      this.logError('Permission elevation failed', error, config.verbose);
      return false;
    }
  }

  /**
   * Elevate permissions on Windows
   * @param {string} filePath - Path to the file
   * @param {object} options - Configuration options
   * @returns {boolean} Success indicator
   */
  static windowsElevatePermissions(filePath, options) {
    const isDirectory = fs.statSync(filePath).isDirectory();
    const commands = [];

    // Remove read-only attribute if present
    commands.push({
      command: 'powershell',
      args: [
        '-Command',
        `Set-ItemProperty -Path "${filePath}" -Name IsReadOnly -Value $false`
      ]
    });

    // Grant full control using icacls
    commands.push({
      command: 'icacls',
      args: [
        filePath,
        '/grant',
        'Everyone:F',
        ...(options.recursive ? ['/T', '/C', '/Q'] : [])
      ]
    });

    // For directories, we might also want to set inheritance flags
    if (isDirectory) {
      commands.push({
        command: 'powershell',
        args: [
          '-Command',
          `Get-ChildItem -Path "${filePath}" -Recurse | ForEach-Object { $_.Attributes = $_.Attributes -band -bnot [System.IO.FileAttributes]::ReadOnly }`
        ]
      });
    }

    // For executable files specifically
    if (filePath.endsWith('.exe') || filePath.endsWith('.bat') || filePath.endsWith('.cmd')) {
      commands.push({
        command: 'icacls',
        args: [filePath, '/grant', 'Everyone:RX']
      });
    }

    return this.executeCommands(commands, options);
  }

  /**
   * Elevate permissions on macOS
   * @param {string} filePath - Path to the file
   * @param {object} options - Configuration options
   * @returns {boolean} Success indicator
   */
  static macOSElevatePermissions(filePath, options) {
    const isDirectory = fs.statSync(filePath).isDirectory();
    const commands = [];

    // Basic executable permissions
    let chmodArgs = ['+x', filePath];
    
    // Add recursive flag if needed
    if (isDirectory && options.recursive) {
      chmodArgs = ['-R', '+x', filePath];
    }

    // Add extra permissions if specified
    if (options.extraPermissions && options.extraPermissions.length > 0) {
      chmodArgs = [options.extraPermissions.join(''), filePath];
      if (isDirectory && options.recursive) {
        chmodArgs.splice(0, 0, '-R');
      }
    }

    // Use sudo if admin access requested
    if (options.useAdmin) {
      commands.push({
        command: 'sudo',
        args: ['chmod', ...chmodArgs]
      });
    } else {
      commands.push({
        command: 'chmod',
        args: chmodArgs
      });
    }

    // For directories with recursive flag, ensure subdirectories are accessible
    if (isDirectory && options.recursive) {
      commands.push({
        command: options.useAdmin ? 'sudo' : '',
        args: options.useAdmin ? ['find', filePath, '-type', 'd', '-exec', 'chmod', '755', '{}', ';'] :
                                ['find', filePath, '-type', 'd', '-exec', 'chmod', '755', '{}', ';']
      });
    }

    return this.executeCommands(commands, options);
  }

  /**
   * Elevate permissions on Linux/Unix systems
   * @param {string} filePath - Path to the file
   * @param {object} options - Configuration options
   * @returns {boolean} Success indicator
   */
  static linuxElevatePermissions(filePath, options) {
    const isDirectory = fs.statSync(filePath).isDirectory();
    const commands = [];

    // Determine chmod arguments
    let chmodPermission = '+x'; // Default permission is executable
    
    // Use custom permissions if provided
    if (options.extraPermissions && options.extraPermissions.length > 0) {
      chmodPermission = options.extraPermissions.join('');
    }

    // Basic chmod command
    let chmodArgs = [chmodPermission, filePath];
    
    // Add recursive flag if needed
    if (isDirectory && options.recursive) {
      chmodArgs = ['-R', chmodPermission, filePath];
    }

    // Use sudo if admin access requested
    if (options.useAdmin) {
      commands.push({
        command: 'sudo',
        args: ['chmod', ...chmodArgs]
      });
    } else {
      commands.push({
        command: 'chmod',
        args: chmodArgs
      });
    }

    // For scripts, also ensure they have proper line endings
    if (filePath.endsWith('.sh') || filePath.endsWith('.js') || !filePath.includes('.')) {
      commands.push({
        command: options.useAdmin ? 'sudo' : '',
        args: options.useAdmin ? ['sed', '-i', 's/\r$//', filePath] : ['sed', '-i', 's/\r$//', filePath]
      });
    }

    return this.executeCommands(commands, options);
  }

  /**
   * Execute a series of commands
   * @param {Array} commands - Array of command objects
   * @param {object} options - Configuration options
   * @returns {boolean} Success indicator
   */
  static executeCommands(commands, options = {}) {
    return new Promise((resolve) => {
      const executeNext = (index) => {
        if (index >= commands.length) {
          if (options.verbose) {
            console.log('All commands executed successfully');
          }
          resolve(true);
          return;
        }

        const cmd = commands[index];
        
        // Skip empty commands
        if (!cmd.command) {
          executeNext(index + 1);
          return;
        }

        if (options.verbose) {
          console.log(`Executing: ${cmd.command} ${cmd.args.join(' ')}`);
        }

        const proc = spawn(cmd.command, cmd.args, { shell: true });
        let stdoutData = '';
        let stderrData = '';

        proc.stdout.on('data', (data) => {
          stdoutData += data;
          if (options.verbose) {
            console.log(`[${cmd.command}] stdout: ${data}`);
          }
        });

        proc.stderr.on('data', (data) => {
          stderrData += data;
          if (options.verbose) {
            console.error(`[${cmd.command}] stderr: ${data}`);
          }
        });

        proc.on('close', (code) => {
          if (code === 0) {
            if (options.verbose) {
              console.log(`Command ${index + 1}/${commands.length} executed successfully`);
            }
            executeNext(index + 1);
          } else {
            const errorMsg = `Command failed with code ${code}: ${cmd.command} ${cmd.args.join(' ')}`;
            console.error(errorMsg);
            
            if (options.stopOnError) {
              this.logError(errorMsg, new Error(stderrData || 'Command execution failed'), options.verbose);
              resolve(false);
            } else {
              if (options.verbose) {
                console.warn(`Continuing despite error in command ${index + 1}/${commands.length}`);
              }
              executeNext(index + 1);
            }
          }
        });

        proc.on('error', (err) => {
          const errorMsg = `Failed to execute command: ${cmd.command}`;
          this.logError(errorMsg, err, options.verbose);
          
          if (options.stopOnError) {
            resolve(false);
          } else {
            executeNext(index + 1);
          }
        });
      };

      // Start executing commands
      executeNext(0);
    });
  }

  /**
   * Log error with standardized format
   * @param {string} message - Error message
   * @param {Error} error - Error object
   * @param {boolean} verbose - Whether to show detailed output
   */
  static logError(message, error, verbose = false) {
    console.error('Permission Elevation Error:');
    console.error(`- ${message}`);
    console.error(`- Platform: ${process.platform}`);
    console.error(`- Error Details: ${error.message}`);
    
    if (verbose) {
      console.error('- Full Error Stack:');
      console.error(error.stack);
    }
  }

  /**
   * Check if the current process has admin/root privileges
   * @returns {boolean} True if running with elevated privileges
   */
  static hasAdminPrivileges() {
    try {
      if (process.platform === 'win32') {
        // On Windows, check for admin rights
        const adminCheckProc = spawn('net', ['session'], { shell: true, stdio: 'ignore' });
        return adminCheckProc.status === 0;
      } else {
        // On Unix, check effective user ID
        return process.getuid && process.getuid() === 0;
      }
    } catch (err) {
      return false;
    }
  }

  /**
   * Makes a file executable on any platform
   * @param {string} filePath - Path to the file to make executable
   * @param {object} options - Additional options
   * @returns {boolean} Success indicator
   */
  static makeExecutable(filePath, options = {}) {
    return this.elevatePermissions(filePath, {
      ...options,
      extraPermissions: ['+x']
    });
  }

  /**
   * Sets full read/write/execute permissions (777) on any platform
   * @param {string} filePath - Path to the file
   * @param {object} options - Additional options
   * @returns {boolean} Success indicator
   */
  static setFullPermissions(filePath, options = {}) {
    if (process.platform === 'win32') {
      return this.windowsElevatePermissions(filePath, options);
    } else {
      return this.elevatePermissions(filePath, {
        ...options,
        extraPermissions: ['a+rwx']
      });
    }
  }
}

// Export the class
module.exports = { PermissionElevator };

// If this script is run directly, process command line arguments
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node PermissionElevator.js <file-path> [--verbose] [--recursive]');
    process.exit(1);
  }

  const filePath = args[0];
  const options = {
    verbose: args.includes('--verbose'),
    recursive: args.includes('--recursive'),
    stopOnError: !args.includes('--continue-on-error'),
    useAdmin: !args.includes('--no-admin')
  };

  PermissionElevator.elevatePermissions(filePath, options)
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}