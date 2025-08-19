// __tests__/PerformanceIntegration.test.ts
describe('Performance Integration', () => {
    test('should handle rapid successive searches', async () => {
        const searches = Array.from({ length: 100 }, () => 
            searchEngine.search('javascript')
        );
        
        const startTime = performance.now();
        await Promise.all(searches);
        const duration = performance.now() - startTime;
        
        expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
    
    test('should maintain performance with growing index', async () => {
        // Test performance as the index grows
    });
});