// axis-router.js - OBINexus Axis Architecture Router
// Implements the <*>.<**>obinexus.<-->.<->.org naming scheme

class AxisRouter {
    constructor() {
        // Service type mappings
        this.serviceTypes = {
            'webservice': { port: 8080, protocol: 'https' },
            'api': { port: 8081, protocol: 'https' },
            'mobileserver': { port: 8082, protocol: 'https' },
            'telemetry': { port: 8083, protocol: 'wss' },
            'p2p': { port: 8084, protocol: 'p2p' }
        };

        // Operation modes
        this.operationModes = {
            'HITL': 'Human-In-The-Loop',
            'HOTL': 'Human-Out-Of-The-Loop'
        };

        // Division registry
        this.divisions = {
            'computing': { owner: 'Nnamdi Michael Okpala', status: 'active' },
            'publishing': { owner: '[Owner Name]', status: 'active' },
            'ux': { owner: '[Open Franchise]', status: 'franchise' },
            'healthcare': { owner: '[Open Franchise]', status: 'franchise' },
            'education': { owner: '[Open Franchise]', status: 'franchise' },
            'arts': { owner: '[Open Franchise]', status: 'franchise' }
        };

        // Branch types
        this.branchTypes = {
            'internal': { access: 'restricted', validation: 'strict' },
            'external': { access: 'open', validation: 'moderate' }
        };

        // Initialize telemetry integration
        this.telemetrySystem = null; // Will be set by IntentionPromotionEngine
    }

    /**
     * Parse axis name into components
     * @param {string} axisName - Full axis name (e.g., webservice.HITL.obinexus.computing.internal.org)
     * @returns {Object} Parsed components
     */
    parseAxisName(axisName) {
        const parts = axisName.split('.');
        
        if (parts.length !== 6 || parts[2] !== 'obinexus' || parts[5] !== 'org') {
            throw new Error(`Invalid axis name format: ${axisName}`);
        }

        return {
            service: parts[0],      // webservice, api, etc.
            operation: parts[1],    // HITL or HOTL
            namespace: parts[2],    // obinexus (fixed)
            division: parts[3],     // computing, publishing, etc.
            branch: parts[4],       // internal or external
            tld: parts[5]          // org (fixed)
        };
    }

    /**
     * Validate axis components against registry
     * @param {Object} axisComponents - Parsed axis components
     * @returns {boolean} Validation result
     */
    validateAxis(axisComponents) {
        // Check service type
        if (!this.serviceTypes[axisComponents.service]) {
            console.error(`Unknown service type: ${axisComponents.service}`);
            return false;
        }

        // Check operation mode
        if (!this.operationModes[axisComponents.operation]) {
            console.error(`Unknown operation mode: ${axisComponents.operation}`);
            return false;
        }

        // Check division
        if (!this.divisions[axisComponents.division]) {
            console.error(`Unknown division: ${axisComponents.division}`);
            return false;
        }

        // Check branch type
        if (!this.branchTypes[axisComponents.branch]) {
            console.error(`Unknown branch type: ${axisComponents.branch}`);
            return false;
        }

        return true;
    }

    /**
     * Route request to appropriate service
     * @param {Object} request - Incoming request with axis header
     * @returns {Object} Routing information
     */
    route(request) {
        const axisName = request.headers['x-axis-name'] || request.hostname;
        
        try {
            const axis = this.parseAxisName(axisName);
            
            if (!this.validateAxis(axis)) {
                throw new Error('Invalid axis configuration');
            }

            // Log telemetry if available
            if (this.telemetrySystem) {
                this.telemetrySystem.trackAxisAccess(axisName, 'route', {
                    timestamp: Date.now(),
                    userId: request.userId,
                    sessionId: request.sessionId
                });
            }

            const serviceConfig = this.serviceTypes[axis.service];
            const divisionConfig = this.divisions[axis.division];
            const branchConfig = this.branchTypes[axis.branch];

            return {
                success: true,
                routing: {
                    host: `${axis.service}-${axis.division}.obinexus.local`,
                    port: serviceConfig.port,
                    protocol: serviceConfig.protocol,
                    division: divisionConfig,
                    accessLevel: branchConfig.access,
                    operationMode: axis.operation
                },
                axis: axis
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                fallback: 'webservice.HITL.obinexus.ux.internal.org'
            };
        }
    }

    /**
     * Generate axis name from components
     * @param {Object} components - Axis components
     * @returns {string} Full axis name
     */
    generateAxisName(components) {
        const defaults = {
            service: 'webservice',
            operation: 'HITL',
            namespace: 'obinexus',
            division: 'ux',
            branch: 'internal',
            tld: 'org'
        };

        const merged = { ...defaults, ...components };
        
        return `${merged.service}.${merged.operation}.${merged.namespace}.${merged.division}.${merged.branch}.${merged.tld}`;
    }

    /**
     * Register new division (franchise onboarding)
     * @param {string} divisionName - Name of new division
     * @param {Object} config - Division configuration
     */
    registerDivision(divisionName, config) {
        if (this.divisions[divisionName]) {
            throw new Error(`Division ${divisionName} already exists`);
        }

        this.divisions[divisionName] = {
            owner: config.owner,
            status: config.status || 'franchise',
            registered: Date.now()
        };

        // Log franchise registration
        if (this.telemetrySystem) {
            this.telemetrySystem.trackAxisAccess(
                `franchise.HITL.obinexus.${divisionName}.internal.org`,
                'register',
                config
            );
        }
    }

    /**
     * Get service endpoint for axis
     * @param {string} axisName - Full axis name
     * @returns {string} Service endpoint URL
     */
    getServiceEndpoint(axisName) {
        const routing = this.route({ headers: { 'x-axis-name': axisName } });
        
        if (!routing.success) {
            throw new Error(routing.error);
        }

        const { protocol, host, port } = routing.routing;
        return `${protocol}://${host}:${port}`;
    }

    /**
     * Middleware for Express/HTTP servers
     * @returns {Function} Express middleware
     */
    middleware() {
        return (req, res, next) => {
            const routing = this.route(req);
            
            if (!routing.success) {
                return res.status(400).json({
                    error: 'Invalid axis configuration',
                    details: routing.error,
                    fallback: routing.fallback
                });
            }

            // Attach routing info to request
            req.axis = routing.axis;
            req.routing = routing.routing;
            
            // Set response headers
            res.setHeader('X-Axis-Name', this.generateAxisName(routing.axis));
            res.setHeader('X-Axis-Division', routing.axis.division);
            res.setHeader('X-Axis-Operation', routing.axis.operation);
            
            next();
        };
    }
}

// Integration with Intention Promotion Engine
class AxisTelemetryIntegration {
    constructor(axisRouter) {
        this.router = axisRouter;
        this.intentionStates = new Map();
    }

    /**
     * Track axis access with intention detection
     * @param {string} axisName - Full axis name
     * @param {string} action - User action
     * @param {Object} data - Additional data
     */
    trackAxisAccess(axisName, action, data) {
        const axis = this.router.parseAxisName(axisName);
        
        // Determine if this is a disability-mode access
        const isDisabilityMode = data.userState?.hasDisability || false;
        
        // Track intention state
        const intentionKey = `${data.userId}-${axis.division}`;
        const currentState = this.intentionStates.get(intentionKey) || 'BASELINE';
        
        // Update intention based on access patterns
        let newState = currentState;
        if (action === 'error') {
            newState = this.transitionState(currentState, 'ERROR');
        } else if (action === 'retry' && currentState === 'ERROR') {
            newState = 'ERROR_LOOP';
        } else if (data.responseTime > 3000) {
            newState = 'HESITANT';
        }
        
        this.intentionStates.set(intentionKey, newState);
        
        // Log telemetry event
        console.log('Axis Telemetry:', {
            axis: axisName,
            action: action,
            intention: newState,
            disability: isDisabilityMode,
            timestamp: Date.now()
        });
    }

    /**
     * State transition logic
     * @param {string} currentState - Current intention state
     * @param {string} event - Transition event
     * @returns {string} New state
     */
    transitionState(currentState, event) {
        const transitions = {
            'BASELINE': {
                'ERROR': 'CONFUSED',
                'SLOW': 'HESITANT'
            },
            'HESITANT': {
                'ERROR': 'CONFUSED',
                'SUCCESS': 'BASELINE'
            },
            'CONFUSED': {
                'ERROR': 'ERROR_LOOP',
                'HELP': 'ASSIST_READY'
            },
            'ERROR_LOOP': {
                'HELP': 'ASSIST_READY',
                'SUCCESS': 'BASELINE'
            },
            'ASSIST_READY': {
                'ACCEPT': 'PROMOTED',
                'DECLINE': 'BASELINE'
            }
        };

        return transitions[currentState]?.[event] || currentState;
    }
}

// Export for use in OBINexus system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AxisRouter, AxisTelemetryIntegration };
} else {
    window.AxisRouter = AxisRouter;
    window.AxisTelemetryIntegration = AxisTelemetryIntegration;
}
