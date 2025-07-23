/**
 * Base interface for all data factory plugins
 */
export interface DataFactoryPlugin {
    readonly name: string;
    
    /**
     * Initialize the plugin and its factories
     */
    setup(): Promise<void>;
    
    /**
     * Clean up all resources and created data
     */
    destroy(): Promise<void>;
}

/**
 * Base class for plugins that provides common functionality
 */
export abstract class BasePlugin implements DataFactoryPlugin {
    abstract readonly name: string;
    
    abstract setup(): Promise<void>;
    abstract destroy(): Promise<void>;
}