import { ConfigSchema } from '../schema/ConfigSchema';
import { ValidationResult } from './ValidationResult';
import { IValidationError } from './ValidationError';
import Ajv, { ErrorObject } from 'ajv';

/**
 * Provides comprehensive configuration validation
 */
export class ConfigValidator {
  /**
   * JSON Schema validator
   */
  private _ajv: InstanceType<typeof Ajv>;

  /**
   * Creates a new ConfigValidator instance
   */
  constructor() {
    this._ajv = new Ajv({
      allErrors: true,
      verbose: true
    });
  }

  /**
   * Validates the entire configuration against the full schema
   * 
   * @param config - Configuration object to validate
   * @returns ValidationResult with any discovered errors
   */
  validateConfig(config: unknown, schema?: object): ValidationResult {
    const validationResult = new ValidationResult();
    
    // Use provided schema or default to full config schema
    const schemaToValidate = schema || ConfigSchema.getConfigSchema();

    // Compile the schema validator
    const validate = this._ajv.compile(schemaToValidate);

    // Perform validation
    const isValid = validate(config);

    // If validation fails, add errors to the result
    if (!isValid && validate.errors) {
    

      (validate.errors as IValidationError[]).forEach((error: IValidationError) => {
        const path: string = error.instancePath || '';
        const message: string = error.message || 'Unknown validation error';
        const code: string = error.keyword;

        validationResult.addError(path, message, code);
      });
    }

    return validationResult;
  }

  /**
   * Validates a specific section of the configuration
   * 
   * @param section - Configuration section to validate
   * @param sectionSchema - Schema for the specific section
   * @returns ValidationResult with any discovered errors
   */
  validateSection(
    section: unknown, 
    sectionSchema: object
  ): ValidationResult {
    const validationResult = new ValidationResult();
    
    // Compile the section-specific schema validator
    const validate = this._ajv.compile(sectionSchema);

    // Perform validation
    const isValid = validate(section);

    // If validation fails, add errors to the result
    if (!isValid && validate.errors) {
      validate.errors.forEach((error: ErrorObject) => {
        const path = error.dataPath || '';
        const message = error.message || 'Unknown validation error';
        const code = error.keyword;

        validationResult.addError(path, message, code);
      });
    }

    return validationResult;
  }

  /**
   * Retrieves the full configuration schema
   * 
   * @returns Full configuration schema
   */
  getSchema(): object {
    return ConfigSchema.getConfigSchema();
  }
}