// src/core/ioc/index.ts
export * from './container';
export * from './registry';
export * from './providers';

// Create and export a default container instance
import { Container } from './container';
import { registerCoreServices } from './providers';

// Create a default container with core services
const defaultContainer = new Container();
registerCoreServices(defaultContainer);

export { defaultContainer };
