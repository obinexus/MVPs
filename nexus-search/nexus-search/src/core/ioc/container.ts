// src/core/ioc/container.ts
import { Registry } from './registry';

type ProviderFactory<T> = () => T;
type ProviderType<T> = { new(...args: any[]): T } | ProviderFactory<T>;

/**
 * Container for dependency injection
 * Manages the instantiation and retrieval of services
 */
export class Container {
  private registry: Registry;
  private instances: Map<string, any>;
  private singletons: Set<string>;

  constructor(registry?: Registry) {
    this.registry = registry || new Registry();
    this.instances = new Map();
    this.singletons = new Set();
  }

  /**
   * Register a provider with the container
   * @param token Identifier for the provider
   * @param provider Constructor or factory function for the provider
   * @param singleton Whether the provider should be a singleton
   */
  register<T>(
    token: string,
    provider: ProviderType<T>,
    singleton: boolean = true
  ): void {
    this.registry.set(token, provider);
    if (singleton) {
      this.singletons.add(token);
    }
  }

  /**
   * Get an instance of a registered provider
   * @param token Identifier for the provider
   * @param args Optional arguments to pass to the constructor or factory
   */
  get<T>(token: string, ...args: any[]): T {
    // Check if it's a singleton and already instantiated
    if (this.singletons.has(token) && this.instances.has(token)) {
      return this.instances.get(token) as T;
    }

    // Get the provider from the registry
    const provider = this.registry.get<T>(token);
    if (!provider) {
      throw new Error(`Provider not registered for token: ${token}`);
    }

    // Instantiate the provider
    let instance: T;
    if (typeof provider === 'function' && !this.isConstructor(provider)) {
      // It's a factory function
      instance = (provider as ProviderFactory<T>)();
    } else {
      // It's a constructor
      const Constructor = provider as { new(...args: any[]): T };
      instance = new Constructor(...args);
    }

    // Store the instance if it's a singleton
    if (this.singletons.has(token)) {
      this.instances.set(token, instance);
    }

    return instance;
  }

  /**
   * Remove a provider from the container
   * @param token Identifier for the provider
   */
  unregister(token: string): boolean {
    this.instances.delete(token);
    this.singletons.delete(token);
    return this.registry.delete(token);
  }

  /**
   * Check if a provider is registered
   * @param token Identifier for the provider
   */
  has(token: string): boolean {
    return this.registry.has(token);
  }

  /**
   * Clear all providers and instances
   */
  clear(): void {
    this.registry.clear();
    this.instances.clear();
    this.singletons.clear();
  }

  /**
   * Check if a function is a constructor
   * @param fn Function to check
   */
  private isConstructor(fn: Function): boolean {
    return !!fn.prototype && !!fn.prototype.constructor.name;
  }
}
