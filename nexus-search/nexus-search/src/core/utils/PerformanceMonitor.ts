export type TimingRecord = {
    count: number;
    totalTime: number;
    maxTime: number;
    minTime: number;
    avgTime: number;
  };
  
  export class PerformanceMonitor {
    private metrics: Map<string, TimingRecord> = new Map();
    private active: boolean = true;
    
    constructor(active: boolean = true) {
      this.active = active;
    }
    
    /**
     * Static method to time a function execution
     */
    static async time<T>(
      name: string, 
      fn: () => Promise<T> | T
    ): Promise<T> {
      const start = performance.now();
      try {
        return await Promise.resolve(fn());
      } finally {
        const duration = performance.now() - start;
        console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
      }
    }
    
    /**
     * Measure execution time of a function
     */
    async measure<T>(
      name: string, 
      fn: () => Promise<T> | T
    ): Promise<T> {
      if (!this.active) {
        return await Promise.resolve(fn());
      }
      
      const start = performance.now();
      try {
        return await Promise.resolve(fn());
      } finally {
        const duration = performance.now() - start;
        this.recordMetric(name, duration);
      }
    }
    
    /**
     * Record a performance metric
     */
    private recordMetric(name: string, duration: number): void {
      const existing = this.metrics.get(name) || {
        count: 0,
        totalTime: 0,
        maxTime: Number.MIN_VALUE,
        minTime: Number.MAX_VALUE,
        avgTime: 0
      };
      
      const updated: TimingRecord = {
        count: existing.count + 1,
        totalTime: existing.totalTime + duration,
        maxTime: Math.max(existing.maxTime, duration),
        minTime: Math.min(existing.minTime, duration),
        avgTime: (existing.totalTime + duration) / (existing.count + 1)
      };
      
      this.metrics.set(name, updated);
    }
    
    /**
     * Get performance metrics
     */
    getMetrics(): Record<string, TimingRecord> {
      return Object.fromEntries(this.metrics);
    }
    
    /**
     * Get metrics for a specific operation
     */
    getMetric(name: string): TimingRecord | undefined {
      return this.metrics.get(name);
    }
    
    /**
     * Reset all metrics
     */
    resetMetrics(): void {
      this.metrics.clear();
    }
    
    /**
     * Enable or disable performance monitoring
     */
    setActive(active: boolean): void {
      this.active = active;
    }
  }