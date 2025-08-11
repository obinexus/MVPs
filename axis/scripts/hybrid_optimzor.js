function optimizeEcosystemSurvival(entity) {
    const independenceRatio = entity.independenceScore;
    const interdependenceRatio = 1 - independenceRatio;
    
    return {
        strategy: 'hybrid',
        actions: [
            maintainCoreIndependence(independenceRatio),
            leverageEcosystemSupport(interdependenceRatio),
            balanceAutonomyWithCollaboration()
        ]
    };
}
