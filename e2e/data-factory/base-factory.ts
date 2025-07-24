export abstract class Factory<TOptions = unknown, TResult = unknown> {
    abstract name: string;
    
    /**
     * Set up any necessary resources (database connections, etc.)
     */
    abstract setup(): Promise<void>;
    
    /**
     * Clean up resources and created data
     */
    abstract destroy(): Promise<void>;
    
    /**
     * Build an object without persisting it
     */
    abstract build(options?: TOptions): TResult | Promise<TResult>;
    
    /**
     * Build and persist an object
     */
    abstract create(options?: TOptions): Promise<TResult>;
}