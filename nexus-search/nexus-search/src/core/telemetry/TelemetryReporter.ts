import { IndexTelemetry } from './IndexTelemetry';
import { MetricsFilter, EventFilter, ErrorFilter } from './TelemetryTypes';

export class TelemetryReporter {
  private telemetry: IndexTelemetry;
  
  constructor(telemetry: IndexTelemetry) {
    this.telemetry = telemetry;
  }
  
  generateMetricsReport(filter?: MetricsFilter): string {
    const report = this.telemetry.getMetrics(filter);
    
    let output = '# Metrics Report\n\n';
    output += `Total metrics: ${report.summary.count}\n\n`;
    
    // Add averages
    output += '## Averages\n\n';
    Object.entries(report.summary.averages).forEach(([key, value]) => {
      output += `- ${key}: ${value.toFixed(2)}\n`;
    });
    
    // Add min/max
    output += '\n## Min/Max Values\n\n';
    output += '| Metric | Min | Max |\n';
    output += '|--------|-----|-----|\n';
    
    const keys = new Set([
      ...Object.keys(report.summary.min),
      ...Object.keys(report.summary.max)
    ]);
    
    Array.from(keys).sort().forEach(key => {
      const min = report.summary.min[key] !== undefined 
        ? report.summary.min[key].toFixed(2) 
        : 'N/A';
      const max = report.summary.max[key] !== undefined 
        ? report.summary.max[key].toFixed(2) 
        : 'N/A';
      output += `| ${key} | ${min} | ${max} |\n`;
    });
    
    return output;
  }
  
  generateEventReport(filter?: EventFilter): string {
    const report = this.telemetry.getEvents(filter);
    
    let output = '# Events Report\n\n';
    output += `Total events: ${report.summary.count}\n\n`;
    
    // Add event counts by type
    output += '## Event Counts\n\n';
    output += '| Event Type | Count |\n';
    output += '|------------|-------|\n';
    
    Object.entries(report.summary.groupedCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        output += `| ${type} | ${count} |\n`;
      });
    
    return output;
  }
  
  generateErrorReport(filter?: ErrorFilter): string {
    const report = this.telemetry.getErrors(filter);
    
    let output = '# Errors Report\n\n';
    output += `Total errors: ${report.summary.count}\n\n`;
    
    // Add error counts by type
    output += '## Error Counts\n\n';
    output += '| Error Type | Count |\n';
    output += '|------------|-------|\n';
    
    Object.entries(report.summary.groupedCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        output += `| ${type} | ${count} |\n`;
      });
    
    return output;
  }
  
  generateFullReport(): string {
    return [
      this.generateMetricsReport(),
      '',
      this.generateEventReport(),
      '',
      this.generateErrorReport()
    ].join('\n');
  }
}
