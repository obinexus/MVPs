import fs from 'fs';
import path from 'path';

export class AuditLogger {
  constructor(private logPath: string) {}

  log(operation: string, zid: string, token?: string): void {
    const entry = {
      timestamp: new Date().toISOString(),
      zid,
      operation,
      token
    };
    try {
      fs.mkdirSync(path.dirname(this.logPath), { recursive: true });
      fs.appendFileSync(this.logPath, JSON.stringify(entry) + '\n');
    } catch {
      // ignore logging errors
    }
  }
}
