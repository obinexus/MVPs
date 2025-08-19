import { TelemetryEvent, MetricsFilter, MetricsReport } from './TelemetryTypes';

export class MetricsCollection {
  private metrics: TelemetryEvent[] = [];
  
  add(name: string, data: Record<string, any>): void {
    this.metrics.push({
      name,
      ...data,
      timestamp: data.timestamp || Date.now()
    });
  }
  
  getReport(filter?: MetricsFilter): MetricsReport {
    let filtered = this.metrics;
    
    if (filter) {
      if (filter.startTime !== undefined) {
        filtered = filtered.filter(m => m.timestamp >= filter.startTime!);
      }
      
      if (filter.endTime !== undefined) {
        filtered = filtered.filter(m => m.timestamp <= filter.endTime!);
      }
      
      if (filter.names && filter.names.length > 0) {
        filtered = filtered.filter(m => filter.names!.includes(m.name));
      }
    }
    
    // Calculate summary statistics
    const summary = {
      count: filtered.length,
      averages: this.calculateAverages(filtered),
      min: this.calculateMinValues(filtered),
      max: this.calculateMaxValues(filtered)
    };
    
    return {
      metrics: filtered,
      summary
    };
  }
  
  getCount(): number {
    return this.metrics.length;
  }
  
  export(): TelemetryEvent[] {
    return [...this.metrics];
  }
  
  import(data: TelemetryEvent[]): void {
    this.metrics = [...this.metrics, ...data];
  }
  
  private calculateAverages(metrics: TelemetryEvent[]): Record<string, number> {
    const sums: Record<string, { sum: number, count: number }> = {};
    
    metrics.forEach(metric => {
      Object.entries(metric).forEach(([key, value]) => {
        if (typeof value === 'number' && key !== 'timestamp') {
          if (!sums[key]) sums[key] = { sum: 0, count: 0 };
          sums[key].sum += value;
          sums[key].count++;
        }
      });
    });
    
    const averages: Record<string, number> = {};
    Object.entries(sums).forEach(([key, { sum, count }]) => {
      averages[key] = sum / count;
    });
    
    return averages;
  }
  
  private calculateMinValues(metrics: TelemetryEvent[]): Record<string, number> {
    const mins: Record<string, number> = {};
    
    metrics.forEach(metric => {
      Object.entries(metric).forEach(([key, value]) => {
        if (typeof value === 'number' && key !== 'timestamp') {
          if (mins[key] === undefined || value < mins[key]) {
            mins[key] = value;
          }
        }
      });
    });
    
    return mins;
  }
  
  private calculateMaxValues(metrics: TelemetryEvent[]): Record<string, number> {
    const maxs: Record<string, number> = {};
    
    metrics.forEach(metric => {
      Object.entries(metric).forEach(([key, value]) => {
        if (typeof value === 'number' && key !== 'timestamp') {
          if (maxs[key] === undefined || value > maxs[key]) {
            maxs[key] = value;
          }
        }
      });
    });
    
    return maxs;
  }
}
