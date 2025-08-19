// src/adapters/DOPAdapter.ts

import { IndexedDocument, SearchOptions, SearchResult } from '@/core/types';

type Logic = {
  name: string;
  state: any;
  actions: Record<string, Function>;
  render: Function;
};

/**
 * DOPAdapter enables Data-Oriented Programming integration
 * by adapting between OOP, functional, and data-oriented paradigms
 */
export class DOPAdapter<T> {
  private readonly logic: Logic;
  
  constructor(logic: Logic) {
    this.logic = logic;
  }
  
  /**
   * Convert to functional programming style
   */
  toFunctional(): (...args: any[]) => any {
    const { name, state, actions, render } = this.logic;
    
    return function FunctionalComponent(...args: any[]): any {
      const currentState = { ...state };
      const ctx = {
        state: currentState,
        ...Object.keys(actions).reduce((acc, key) => {
          acc[key] = (...actionArgs: any[]) => actions[key](currentState, ...actionArgs);
          return acc;
        }, {} as Record<string, Function>)
      };
      
      return render(ctx, ...args);
    };
  }
  
  /**
   * Convert to object-oriented programming style
   */
  toOOP(): new (...args: any[]) => any {
    const { name, state, actions, render } = this.logic;
    
    const OOPClass = class {
      state: any;
      
      constructor(...args: any[]) {
        this.state = { ...state };
        
        // Bind actions to this instance
        Object.keys(actions).forEach(key => {
          (this as any)[key] = (...actionArgs: any[]) => actions[key](this.state, ...actionArgs);
        });
      }
      
      render(...args: any[]): any {
        return render(this, ...args);
      }
    };
    
    // Set class name dynamically
    Object.defineProperty(OOPClass, 'name', { value: name });
    
    return OOPClass;
  }
  
  /**
   * Adapt a function to work with both paradigms
   */
  static adaptFunction<T, R>(
    fn: (data: T, ...args: any[]) => R
  ): {
    func: (data: T, ...args: any[]) => R;
    method: (this: { state: T }, ...args: any[]) => R;
  } {
    return {
      func: fn,
      method: function(this: { state: T }, ...args: any[]): R {
        return fn(this.state, ...args);
      }
    };
  }
  
  /**
   * Create a search function adapter that works with both paradigms
   */
  static createSearchAdapter(searchEngine: any) {
    const searchLogic = {
      name: 'SearchEngine',
      state: {
        documents: new Map(),
        isInitialized: false
      },
      actions: {
        search: async (state: any, query: string, options?: SearchOptions) => {
          return await searchEngine.search(query, options);
        },
        addDocument: async (state: any, document: IndexedDocument) => {
          state.documents.set(document.id, document);
          await searchEngine.addDocument(document);
        },
        removeDocument: async (state: any, id: string) => {
          state.documents.delete(id);
          await searchEngine.removeDocument(id);
        }
      },
      render: (ctx: any) => {
        return {
          search: ctx.search,
          addDocument: ctx.addDocument,
          removeDocument: ctx.removeDocument
        };
      }
    };
    
    return new DOPAdapter(searchLogic);
  }
}