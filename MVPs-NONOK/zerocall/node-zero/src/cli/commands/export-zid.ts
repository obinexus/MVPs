import { Command } from 'commander';
import { FileHandler } from '../handlers/FileHandler.js';
import { ZeroParser, FileFormat } from '@/parser/index.js';

export interface ExportOptions {
  input: string;
  output?: string;
  format?: string;
}

export function registerExportZidCommand(program: Command): Command {
  return program
    .command('export-zid')
    .description('Export a ZID in base64 or JSON')
    .requiredOption('-i, --input <file>', 'ZID file')
    .option('-o, --output <file>', 'Output file')
    .option('--format <base64|json>', 'Output format', 'json')
    .action(async (opts: ExportOptions) => {
      const id = await FileHandler.readId(opts.input);
      const parser = new ZeroParser();
      const format = opts.format === 'base64' ? FileFormat.TEXT : FileFormat.JSON;
      const serialized = parser.serializeData({ id }, format);
      if (opts.output) {
        await FileHandler.writeText(opts.output, serialized.toString());
      } else {
        console.log(serialized.toString());
      }
    });
}
