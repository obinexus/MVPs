// src/register.js
const path = require('path');
const moduleAlias = require('module-alias');

// Register module aliases
moduleAlias.addAliases({
  '@': path.join(__dirname, 'src'),
  '@bin': path.join(__dirname, 'bin'),
  '@utils': path.join(__dirname, 'src/utils'),
  '@context': path.join(__dirname, 'src/context'),
  '@crypto': path.join(__dirname, 'src/crypto'),
  '@encoding': path.join(__dirname, 'src/encoding'),
  '@errors': path.join(__dirname, 'src/errors'),
  '@types': path.join(__dirname, 'src/types')
});

// Register the module alias for the main entry point
moduleAlias.addAlias('elavate', path.join(__dirname, 'src/elavate.js'));
moduleAlias.addAlias('register', path.join(__dirname, 'src/register.js'));
