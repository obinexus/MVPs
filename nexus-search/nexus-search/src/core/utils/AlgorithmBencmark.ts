import { PerformanceMonitor } from './PerformanceMonitor';

export type BenchmarkResult = {
  algorithm: string;
  avgTime: number;
  maxTime: number;
  minTime: number;
  resultsCount: number;
  memoryUsage?: number;
};

export class AlgorithmBenchmark {
  private readonly iterations: number;
  private readonly warmupIterations: number;
  
  constructor(iterations: number = 5, warmupIterations: number = 2) {
    this.iterations = iterations;
    this.warmupIterations = warmupIterations;
  }
  
  /**
   * Static method to benchmark a single algorithm
   */
  static async benchmark<T, R>(
    name: string,
    algorithm: (input: T) => Promise<R> | R,
    input: T,
    iterations: number = 5
  ): Promise<BenchmarkResult> {
    // Warmup
    await algorithm(input);
    
    const times: number[] = [];
    let lastResult: R | undefined;
    let resultsCount = 0;
    
    // Run benchmark
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      lastResult = await Promise.resolve(algorithm(input));
      const end = performance.now();
      times.push(end - start);
      
      // Count results if it's an array
      if (Array.isArray(lastResult)) {
        resultsCount = lastResult.length;
      }
    }
    
    // Calculate statistics
    const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const maxTime = Math.max(...times);
    const minTime = Math.min(...times);
    
    return {
      algorithm: name,
      avgTime,
      maxTime,
      minTime,
      resultsCount
    };
  }
  
  /**
   * Benchmark multiple algorithms against the same input
   */
  async compareAlgorithms<T, R>(
    algorithms: Array<{
      name: string;
      fn: (input: T) => Promise<R> | R;
    }>,
    input: T
  ): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];
    
    // Warmup phase
    for (const algo of algorithms) {
      for (let i = 0; i < this.warmupIterations; i++) {
        await algo.fn(input);
      }
    }
    
    // Benchmark phase
    for (const algo of algorithms) {
      const result = await AlgorithmBenchmark.benchmark(
        algo.name,
        algo.fn,
        input,
        this.iterations
      );
      results.push(result);
    }
    
    return results.sort((a, b) => a.avgTime - b.avgTime);
  }
  
  /**
   * Benchmark search algorithms specifically
   */
  async benchmarkSearchAlgorithms<T>(
    searchEngine: {
      search: (query: string, options?: any) => Promise<T[]> | T[];
    },
    queries: string[],
    algorithms: Array<{
      name: string;
      options: any;
    }>
  ): Promise<Record<string, BenchmarkResult>> {
    const monitor = new PerformanceMonitor();
    const results: Record<string, BenchmarkResult> = {};
    
    for (const algorithm of algorithms) {
      let totalTime = 0;
      let totalResults = 0;
      const times: number[] = [];
      
      // Warmup
      for (const query of queries.slice(0, 2)) {
        await searchEngine.search(query, algorithm.options);
      }
      
      // Benchmark
      for (const query of queries) {
        const start = performance.now();
        const searchResults = await searchEngine.search(query, algorithm.options);
        const end = performance.now();
        
        const duration = end - start;
        times.push(duration);
        totalTime += duration;
        totalResults += Array.isArray(searchResults) ? searchResults.length : 0;
      }
      
      results[algorithm.name] = {
        algorithm: algorithm.name,
        avgTime: totalTime / queries.length,
        maxTime: Math.max(...times),
        minTime: Math.min(...times),
        resultsCount: totalResults / queries.length
      };
    }
    
    return results;
  }
  
  /**
   * Memory usage benchmark
   */
  static async benchmarkMemoryUsage<T>(
    operation: () => Promise<T> | T
  ): Promise<{ result: T; memoryUsageMB: number }> {
    // Record memory before
    const memoryBefore = process.memoryUsage().heapUsed;
    
    // Run operation
    const result = await Promise.resolve(operation());
    
    // Record memory after
    const memoryAfter = process.memoryUsage().heapUsed;
    const memoryUsageMB = (memoryAfter - memoryBefore) / (1024 * 1024);
    
    return {
      result,
      memoryUsageMB
    };
  }
}