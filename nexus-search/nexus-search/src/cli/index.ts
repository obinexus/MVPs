#!/usr/bin/env node
import { CommandRunner } from './CommandRunner';

// Main CLI entrypoint
async function main(): Promise<void> {
  const commandRunner = new CommandRunner();
  await commandRunner.run(process.argv.slice(2));
}

main().catch(err => {
  console.error('Error executing command:', err);
  process.exit(1);
});