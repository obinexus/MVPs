import { SearchableDocument, MetricsResult } from "@/types";
/**
 * Blob reader adapter for handling file uploads in browser environments
 */
export declare class BlobReaderAdapter {
    private performanceMonitor;
    constructor();
    readBlob(blob: Blob): Promise<string>;
    createDocumentFromBlob(blob: Blob, id: string, metadata?: Record<string, unknown>): Promise<SearchableDocument>;
    getMetrics(): MetricsResult;
}
