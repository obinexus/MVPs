// src/core/ioc/registry.ts

/**
 * Registry for IoC container
 * Stores provider definitions
 */
export class Registry {
  private providers: Map<string, any>;

  constructor() {
    this.providers = new Map();
  }

  /**
   * Set a provider in the registry
   * @param token Identifier for the provider
   * @param provider Constructor or factory function for the provider
   */
  set<T>(token: string, provider: any): void {
    this.providers.set(token, provider);
  }

  /**
   * Get a provider from the registry
   * @param token Identifier for the provider
   */
  get<T>(token: string): any {
    return this.providers.get(token);
  }

  /**
   * Check if a provider exists in the registry
   * @param token Identifier for the provider
   */
  has(token: string): boolean {
    return this.providers.has(token);
  }

  /**
   * Remove a provider from the registry
   * @param token Identifier for the provider
   */
  delete(token: string): boolean {
    return this.providers.delete(token);
  }

  /**
   * Get all provider tokens
   */
  keys(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Clear all providers
   */
  clear(): void {
    this.providers.clear();
  }
}
