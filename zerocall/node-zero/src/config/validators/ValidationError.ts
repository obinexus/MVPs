/**
 * Interface defining the structure of a validation error
 */
export interface IValidationError {
  instancePath?: string;
  message?: string;
  keyword: string;
}

/**
 * Represents a specific validation error
 */
export class ValidationError implements IValidationError {
    public instancePath: string;
    public message: string;
    public keyword: string;

    /**
     * Creates a new ValidationError instance
     * 
     * @param instancePath - The path to the invalid configuration property
     * @param message - Descriptive error message
     * @param keyword - Error keyword for identification
     */
    constructor(
      instancePath: string,
      message: string,
      keyword: string
    ) {
      this.instancePath = instancePath;
      this.message = message;
      this.keyword = keyword;
    }
  
    /**
     * Converts the validation error to a string representation
     * 
     * @returns A formatted error string
     */
    toString(): string {
      return `[${this.keyword}] ${this.instancePath}: ${this.message}`;
    }
}