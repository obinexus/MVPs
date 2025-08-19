import { TelemetryEvent, ErrorFilter, ErrorReport } from './TelemetryTypes';

export class ErrorCollection {
  private errors: TelemetryEvent[] = [];
  
  add(name: string, data: Record<string, any>): void {
    this.errors.push({
      name,
      ...data,
      timestamp: data.timestamp || Date.now()
    });
  }
  
  getReport(filter?: ErrorFilter): ErrorReport {
    let filtered = this.errors;
    
    if (filter) {
      if (filter.startTime !== undefined) {
        filtered = filtered.filter(e => e.timestamp >= filter.startTime!);
      }
      
      if (filter.endTime !== undefined) {
        filtered = filtered.filter(e => e.timestamp <= filter.endTime!);
      }
      
      if (filter.names && filter.names.length > 0) {
        filtered = filtered.filter(e => filter.names!.includes(e.name));
      }
    }
    
    // Calculate error counts by type
    const groupedCounts: Record<string, number> = {};
    filtered.forEach(error => {
      groupedCounts[error.name] = (groupedCounts[error.name] || 0) + 1;
    });
    
    return {
      errors: filtered,
      summary: {
        count: filtered.length,
        groupedCounts
      }
    };
  }
  
  getCount(): number {
    return this.errors.length;
  }
  
  export(): TelemetryEvent[] {
    return [...this.errors];
  }
  
  import(data: TelemetryEvent[]): void {
    this.errors = [...this.errors, ...data];
  }
}
