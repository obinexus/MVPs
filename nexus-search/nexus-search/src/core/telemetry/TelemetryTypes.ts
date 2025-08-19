export interface TelemetryEvent {
  name: string;
  timestamp: number;
  indexName: string;
  [key: string]: any;
}

export interface MetricsFilter {
  startTime?: number;
  endTime?: number;
  names?: string[];
}

export interface EventFilter {
  startTime?: number;
  endTime?: number;
  names?: string[];
}

export interface ErrorFilter {
  startTime?: number;
  endTime?: number;
  names?: string[];
}

export interface MetricsReport {
  metrics: TelemetryEvent[];
  summary: {
    count: number;
    averages: Record<string, number>;
    min: Record<string, number>;
    max: Record<string, number>;
  };
}

export interface EventReport {
  events: TelemetryEvent[];
  summary: {
    count: number;
    groupedCounts: Record<string, number>;
  };
}

export interface ErrorReport {
  errors: TelemetryEvent[];
  summary: {
    count: number;
    groupedCounts: Record<string, number>;
  };
}

export interface CursorPosition {
  depth: number;
  breadth: number;
  dimension: number;
}

export interface SearchSpace {
  maxDepth: number;
  maxBreadth: number;
  dimensions: number;
  maxResults: number;
  bounds: {
    min: [number, number, number];
    max: [number, number, number];
  };
}

export interface SearchSpaceBounds {
  min: [number, number, number];
  max: [number, number, number];
}

export interface CursorOptions {
  algorithm?: 'bfs' | 'dfs';
  regexEnabled?: boolean;
  initialSpace?: SearchSpace;
}
