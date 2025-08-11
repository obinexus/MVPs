// axis-access-control.js - Department/Division Access Control

class AxisAccessControl {
    constructor(axisRouter) {
        this.router = axisRouter;
        
        // Access level definitions
        this.accessLevels = {
            'public': 0,
            'protected': 1,
            'private': 2
        };
        
        // Department permissions matrix
        this.departmentPermissions = {
            'computing': {
                'public': ['read', 'list'],
                'protected': ['read', 'write', 'execute'],
                'private': ['read', 'write', 'execute', 'admin']
            },
            'publishing': {
                'public': ['read', 'download'],
                'protected': ['read', 'write', 'publish'],
                'private': ['read', 'write', 'publish', 'admin']
            },
            'ux': {
                'public': ['read', 'interact'],
                'protected': ['read', 'write', 'test'],
                'private': ['read', 'write', 'test', 'admin']
            },
            'healthcare': {
                'public': ['read'],
                'protected': ['read', 'write'],
                'private': ['read', 'write', 'medical', 'admin']
            },
            'education': {
                'public': ['read', 'learn'],
                'protected': ['read', 'write', 'teach'],
                'private': ['read', 'write', 'teach', 'admin']
            },
            'arts': {
                'public': ['read', 'view'],
                'protected': ['read', 'write', 'create'],
                'private': ['read', 'write', 'create', 'admin']
            }
        };
    }

    /**
     * Check if user has access to axis endpoint
     * @param {Object} user - User object with credentials
     * @param {string} axisName - Full axis name
     * @param {string} action - Requested action
     * @returns {boolean} Access granted or denied
     */
    checkAccess(user, axisName, action) {
        try {
            const axis = this.router.parseAxisName(axisName);
            const userLevel = this.getUserAccessLevel(user, axis.division);
            const requiredLevel = this.getRequiredLevel(axis);
            
            // Check if user level meets requirement
            if (this.accessLevels[userLevel] < this.accessLevels[requiredLevel]) {
                return false;
            }
            
            // Check specific permissions
            const permissions = this.departmentPermissions[axis.division]?.[userLevel] || [];
            return permissions.includes(action) || permissions.includes('admin');
            
        } catch (error) {
            console.error('Access check error:', error);
            return false;
        }
    }

    /**
     * Get user's access level for a division
     * @param {Object} user - User object
     * @param {string} division - Division name
     * @returns {string} Access level
     */
    getUserAccessLevel(user, division) {
        // Check for division-specific roles
        if (user.roles?.[division]) {
            return user.roles[division];
        }
        
        // Check for global admin
        if (user.isAdmin) {
            return 'private';
        }
        
        // Check for franchise owner
        if (user.ownedDivisions?.includes(division)) {
            return 'private';
        }
        
        // Default to public
        return 'public';
    }

    /**
     * Get required access level from axis
     * @param {Object} axis - Parsed axis components
     * @returns {string} Required access level
     */
    getRequiredLevel(axis) {
        // Parse from axis name pattern
        const axisPath = `${axis.service}.${axis.operation}.${axis.division}`;
        
        // Special rules for certain combinations
        if (axis.operation === 'HOTL' && axis.branch === 'internal') {
            return 'private'; // Automated internal operations need high access
        }
        
        if (axis.service === 'api' && axis.branch === 'external') {
            return 'protected'; // External APIs need at least protected access
        }
        
        // Default based on branch
        return axis.branch === 'internal' ? 'protected' : 'public';
    }

    /**
     * Middleware for access control
     * @returns {Function} Express middleware
     */
    middleware() {
        return (req, res, next) => {
            const user = req.user || { roles: {} };
            const axisName = req.axis ? 
                this.router.generateAxisName(req.axis) : 
                req.headers['x-axis-name'];
            const action = req.method === 'GET' ? 'read' : 'write';
            
            if (!this.checkAccess(user, axisName, action)) {
                return res.status(403).json({
                    error: 'Access denied',
                    required: this.getRequiredLevel(req.axis),
                    current: this.getUserAccessLevel(user, req.axis?.division)
                });
            }
            
            next();
        };
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AxisAccessControl;
} else {
    window.AxisAccessControl = AxisAccessControl;
}
