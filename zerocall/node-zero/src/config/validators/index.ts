/**
 * Validation system exports for Zero library configuration
 * 
 * Provides validation utilities including:
 * - Schema-based configuration validation
 * - Validation result handling
 * - Error reporting and aggregation
 */

// Export validation error types and implementation
export {
    IValidationError,
    ValidationError
} from './ValidationError.js';

// Export validation result types and implementation
export {
    IValidationResult,
    ValidationResult
} from './ValidationResult.js';

// Export main configuration validator 
export {
    ConfigValidator
} from './ConfigValidator.js';