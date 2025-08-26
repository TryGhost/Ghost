import {PersistenceAdapter} from '../adapter';
import type {APIRequestContext, BrowserContext} from '@playwright/test';

interface ApiAdapterOptions<TRequest = unknown, TResponse = unknown> {
    context: BrowserContext;
    endpoint: string;
    queryParams?: Record<string, string>;
    wrapRequest?: (data: TRequest) => unknown;
    extractResponse?: (response: TResponse) => unknown;
}

/**
 * Generic API persistence adapter that works with Playwright's BrowserContext
 * Uses the context's .request property for making API calls
 * Can be extended for specific API implementations
 */
export class ApiPersistenceAdapter<TRequest = unknown, TResponse = unknown> implements PersistenceAdapter {
    protected apiContext: APIRequestContext;
    protected endpoint: string;
    protected queryParams: Record<string, string>;
    protected wrapRequest: (data: TRequest) => unknown;
    protected extractResponse: (response: TResponse) => unknown;
    
    constructor(options: ApiAdapterOptions<TRequest, TResponse>) {
        this.apiContext = options.context.request;
        this.endpoint = options.endpoint;
        this.queryParams = options.queryParams || {};
        this.wrapRequest = options.wrapRequest || ((data: TRequest) => data as unknown);
        this.extractResponse = options.extractResponse || ((response: TResponse) => response as unknown);
    }
    
    protected buildUrl(path?: string): string {
        const url = path ? `${this.endpoint}/${path}` : this.endpoint;
        const params = new URLSearchParams(this.queryParams);
        const queryString = params.toString();
        return queryString ? `${url}?${queryString}` : url;
    }
    
    async insert<T>(entityType: string, data: T): Promise<T> {
        const response = await this.apiContext.post(this.buildUrl(), {
            data: this.wrapRequest(data as unknown as TRequest)
        });
        
        if (!response.ok()) {
            throw new Error(`Failed to create ${entityType}: ${response.status()}`);
        }
        
        const body = await response.json() as TResponse;
        return this.extractResponse(body) as T;
    }
    
    async findById<T>(entityType: string, id: string): Promise<T | null> {
        const response = await this.apiContext.get(this.buildUrl(id));
        
        if (response.status() === 404) {
            return null;
        }
        
        if (!response.ok()) {
            throw new Error(`Failed to find ${entityType}: ${response.status()}`);
        }
        
        const body = await response.json() as TResponse;
        return this.extractResponse(body) as T;
    }
    
    async update<T>(entityType: string, id: string, data: Partial<T>): Promise<T> {
        const existing = await this.findById<T>(entityType, id);
        if (!existing) {
            throw new Error(`${entityType} with id ${id} not found`);
        }
        
        const response = await this.apiContext.put(this.buildUrl(id), {
            data: this.wrapRequest({...existing, ...data} as unknown as TRequest)
        });
        
        if (!response.ok()) {
            throw new Error(`Failed to update ${entityType}: ${response.status()}`);
        }
        
        const body = await response.json() as TResponse;
        return this.extractResponse(body) as T;
    }
    
    async delete(entityType: string, id: string): Promise<void> {
        const response = await this.apiContext.delete(this.buildUrl(id));
        
        if (!response.ok() && response.status() !== 404) {
            throw new Error(`Failed to delete ${entityType}: ${response.status()}`);
        }
    }
}