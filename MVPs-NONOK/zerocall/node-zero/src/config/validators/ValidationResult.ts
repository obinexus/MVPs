import { IValidationError, ValidationError } from './ValidationError';
/**
 * Interface for validation result operations
 */
export interface IValidationResult {
  isValid: boolean;
  getErrors(): IValidationError[];
  hasErrors(): boolean;
  addError(path: string, message: string, code?: string): void;
  merge(otherResult: ValidationResult): void;
}

/**
 * Represents the result of a configuration validation
 */
export class ValidationResult implements IValidationResult {
  /**
   * List of validation errors
   */
  private _errors: IValidationError[] = [];

  /**
   * Indicates whether the validation was successful
   */
  get isValid(): boolean {
    return this._errors.length === 0;
  }

  /**
   * Gets all validation errors
   * 
   * @returns Array of validation errors
   */
  getErrors(): IValidationError[] {
    return [...this._errors];
  }

  /**
   * Checks if there are any validation errors
   * 
   * @returns True if there are errors, false otherwise
   */
  hasErrors(): boolean {
    return this._errors.length > 0;
  }

  /**
   * Adds a new validation error
   * 
   * @param path - The path to the invalid configuration property
   * @param message - Descriptive error message
   * @param code - Optional error code
   */
  addError(path: string, message: string, code?: string): void {
    this._errors.push(new ValidationError(path, message, code || ''));
  }

  /**
   * Merges errors from another ValidationResult
   * 
   * @param otherResult - Another validation result to merge
   */
  merge(otherResult: ValidationResult): void {
    otherResult.getErrors().forEach(error => 
      this._errors.push(error)
    );
  }
}