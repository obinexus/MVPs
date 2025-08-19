export class IndexTelemetry {
    private readonly indexName: string;
    private metrics: MetricsCollection;
    private events: EventCollection;
    private errors: ErrorCollection;
    
    constructor(indexName: string) {
      this.indexName = indexName;
      this.metrics = new MetricsCollection();
      this.events = new EventCollection();
      this.errors = new ErrorCollection();
    }
    
    recordMetric(name: string, data: Record<string, any>): void {
      this.metrics.add(name, {
        ...data,
        timestamp: Date.now(),
        indexName: this.indexName
      });
    }
    
    recordEvent(name: string, data: Record<string, any>): void {
      this.events.add(name, {
        ...data,
        timestamp: Date.now(),
        indexName: this.indexName
      });
    }
    
    recordError(name: string, data: Record<string, any>): void {
      this.errors.add(name, {
        ...data,
        timestamp: Date.now(),
        indexName: this.indexName
      });
    }
    
    getMetrics(filter?: MetricsFilter): MetricsReport {
      return this.metrics.getReport(filter);
    }
    
    getEvents(filter?: EventFilter): EventReport {
      return this.events.getReport(filter);
    }
    
    getErrors(filter?: ErrorFilter): ErrorReport {
      return this.errors.getReport(filter);
    }
    
    // Additional methods for analysis and reporting...
  }