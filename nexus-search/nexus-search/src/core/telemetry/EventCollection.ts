import { TelemetryEvent, EventFilter, EventReport } from './TelemetryTypes';

export class EventCollection {
  private events: TelemetryEvent[] = [];
  
  add(name: string, data: Record<string, any>): void {
    this.events.push({
      name,
      ...data,
      timestamp: data.timestamp || Date.now()
    });
  }
  
  getReport(filter?: EventFilter): EventReport {
    let filtered = this.events;
    
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
    
    // Calculate event counts by type
    const groupedCounts: Record<string, number> = {};
    filtered.forEach(event => {
      groupedCounts[event.name] = (groupedCounts[event.name] || 0) + 1;
    });
    
    return {
      events: filtered,
      summary: {
        count: filtered.length,
        groupedCounts
      }
    };
  }
  
  getCount(): number {
    return this.events.length;
  }
  
  export(): TelemetryEvent[] {
    return [...this.events];
  }
  
  import(data: TelemetryEvent[]): void {
    this.events = [...this.events, ...data];
  }
}
