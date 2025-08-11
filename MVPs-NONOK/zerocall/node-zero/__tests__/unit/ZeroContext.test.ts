import { ZeroContext } from '../../src/context/ZeroContext';
import { ZeroError } from '../../src/errors/ZeroError';
import { 
IZeroConfig,
IZeroAllocator,
ContextFlags
} from '../../src/types/context';

describe('ZeroContext', () => {
describe('Creation and Initialization', () => {
    it('should create context with default configuration', () => {
        const context = ZeroContext.create();
        expect(context).toBeDefined();
        expect(context.config).toBeDefined();
        expect(context.encodingMap).toBeDefined();
        expect(context.activeIds).toBe(0);
        expect(context.memoryUsed).toBe(0);
        expect(context.createdTime).toBeLessThanOrEqual(Date.now());
        expect(context.flags).toBe(ContextFlags.SECURE_MEMORY);
    });

    it('should create context with custom configuration', () => {
        const config: Partial<IZeroConfig> = {
            saltLength: 32,
            separator: '/',
            encodingSize: 32,
            version: 2
        };
        
        const context = ZeroContext.createWithConfig(config);
        expect(context.config).toMatchObject(config);
    });

    it('should throw error for invalid configuration', () => {
        const invalidConfig = {
            saltLength: -1, // Invalid salt length
            separator: '', // Invalid separator
            encodingSize: 8, // Invalid encoding size
            version: 0 // Invalid version
        };

        expect(() => {
            ZeroContext.createWithConfig(invalidConfig);
        }).toThrow(ZeroError);
    });
});

describe('Context Management', () => {
    let context: ZeroContext;

    beforeEach(() => {
        context = ZeroContext.create();
    });

    it('should clone context correctly', () => {
        const clone = context.clone();
        expect(clone).not.toBe(context);
        expect(clone.config).toEqual(context.config);
        expect(clone.flags).toBe(context.flags);
    });

    it('should get correct status', () => {
        const status = context.getStatus();
        expect(status.activeIds).toBe(0);
        expect(status.memoryUsed).toBe(0);
        expect(status.createdTime).toBe(context.createdTime);
        expect(status.version).toBe(context.config.version);
    });

    it('should update configuration', () => {
        const newConfig: Partial<IZeroConfig> = {
            saltLength: 48
        };
        
        const updatedContext = context.updateConfig(newConfig);
        expect(updatedContext.config.saltLength).toBe(48);
        expect(updatedContext).not.toBe(context);
    });
});

describe('Memory Management', () => {
    let context: ZeroContext;

    beforeEach(() => {
        context = ZeroContext.create();
    });

    it('should track allocations correctly', () => {
        context.trackAllocation(100);
        expect(context.memoryUsed).toBe(100);

        context.trackAllocation(50);
        expect(context.memoryUsed).toBe(150);
    });

    it('should track deallocations correctly', () => {
        context.trackAllocation(200);
        context.trackDeallocation(50);
        expect(context.memoryUsed).toBe(150);
    });

    it('should throw error for invalid deallocation', () => {
        expect(() => {
            context.trackDeallocation(100);
        }).toThrow(ZeroError);
    });

    it('should allocate memory correctly', () => {
        const buffer = context.allocate(100);
        expect(buffer).toBeInstanceOf(Buffer);
        expect(buffer.length).toBe(100);
        expect(context.memoryUsed).toBe(100);
    });

    it('should free memory correctly', () => {
        const buffer = context.allocate(100);
        context.free(buffer, 100);
        expect(context.memoryUsed).toBe(0);
    });
});

describe('Custom Allocator', () => {
    let context: ZeroContext;
    let mockAllocator: IZeroAllocator;

    beforeEach(() => {
        context = ZeroContext.create();
        mockAllocator = {
            malloc: jest.fn((size) => Buffer.alloc(size)),
            free: jest.fn(),
            calloc: jest.fn((count, size) => Buffer.alloc(count * size)),
            realloc: jest.fn((_buffer, size) => Buffer.alloc(size))
        };
    });

    it('should set custom allocator', () => {
        context.setAllocator(mockAllocator);
        context.allocate(100);
        expect(mockAllocator.malloc).toHaveBeenCalledWith(100);
    });

    it('should throw error for invalid allocator', () => {
        const invalidAllocator = {
            malloc: 'not a function'
        };

        expect(() => {
            context.setAllocator(invalidAllocator as any);
        }).toThrow(ZeroError);
    });
});

describe('Active IDs Tracking', () => {
    let context: ZeroContext;

    beforeEach(() => {
        context = ZeroContext.create();
    });

    it('should track active IDs correctly', () => {
        context.incrementActiveIds();
        expect(context.activeIds).toBe(1);

        context.incrementActiveIds();
        expect(context.activeIds).toBe(2);

        context.decrementActiveIds();
        expect(context.activeIds).toBe(1);
    });

    it('should throw error when decrementing at zero', () => {
        expect(() => {
            context.decrementActiveIds();
        }).toThrow(ZeroError);
    });
});

describe('User Data Management', () => {
    let context: ZeroContext;

    beforeEach(() => {
        context = ZeroContext.create();
    });

    it('should manage user data correctly', () => {
        const userData = { test: 'data' };
        context.setUserData(userData);
        expect(context.getUserData()).toEqual(userData);
    });

    it('should clear user data on dispose', () => {
        context.setUserData({ test: 'data' });
        context.dispose();
        expect(context.getUserData()).toBeUndefined();
    });
});
});