import {PersistenceAdapter} from '../adapter';
import type {APIRequestContext} from '@playwright/test';

interface ApiAdapterOptions {
    context: APIRequestContext;
    endpoint: string;
    wrapRequest: (data: any) => any;
    extractResponse: (response: any) => any;
}

/**
 * Generic API persistence adapter that works with Playwright's APIRequestContext
 * Can be extended for specific API implementations
 */
export class ApiPersistenceAdapter implements PersistenceAdapter {
    protected context: APIRequestContext;
    protected endpoint: string;
    protected wrapRequest: (data: any) => any;
    protected extractResponse: (response: any) => any;
    
    constructor(options: ApiAdapterOptions) {
        this.context = options.context;
        this.endpoint = options.endpoint;
        this.wrapRequest = options.wrapRequest || (data => data);
        this.extractResponse = options.extractResponse || (response => response);
    }
    
    async insert<T>(entityType: string, data: T): Promise<T> {
        const response = await this.context.post(this.endpoint, {
            data: this.wrapRequest(data)
        });
        
        if (!response.ok()) {
            throw new Error(`Failed to create ${entityType}: ${response.status()}`);
        }
        
        const body = await response.json();
        return this.extractResponse(body);
    }
    
    async findById<T>(entityType: string, id: string): Promise<T | null> {
        const baseEndpoint = this.endpoint.split('?')[0];
        const queryParams = this.endpoint.includes('?') ? '?' + this.endpoint.split('?')[1] : '';
        const response = await this.context.get(`${baseEndpoint}/${id}${queryParams}`);
        
        if (response.status() === 404) {
            return null;
        }
        
        if (!response.ok()) {
            throw new Error(`Failed to find ${entityType}: ${response.status()}`);
        }
        
        const body = await response.json();
        return this.extractResponse(body);
    }
    
    async update<T>(entityType: string, id: string, data: Partial<T>): Promise<T> {
        const existing = await this.findById<any>(entityType, id);
        if (!existing) {
            throw new Error(`${entityType} with id ${id} not found`);
        }
        
        const baseEndpoint = this.endpoint.split('?')[0];
        const queryParams = this.endpoint.includes('?') ? '?' + this.endpoint.split('?')[1] : '';
        const response = await this.context.put(`${baseEndpoint}/${id}${queryParams}`, {
            data: this.wrapRequest({...existing, ...data})
        });
        
        if (!response.ok()) {
            throw new Error(`Failed to update ${entityType}: ${response.status()}`);
        }
        
        const body = await response.json();
        return this.extractResponse(body);
    }
    
    async delete(entityType: string, id: string): Promise<void> {
        const baseEndpoint = this.endpoint.split('?')[0];
        const response = await this.context.delete(`${baseEndpoint}/${id}`);
        
        if (!response.ok() && response.status() !== 404) {
            throw new Error(`Failed to delete ${entityType}: ${response.status()}`);
        }
    }
    
    async deleteMany(entityType: string, ids: string[]): Promise<void> {
        await Promise.all(ids.map(id => this.delete(entityType, id)));
    }
    
    async findMany<T>(entityType: string, filter?: Record<string, unknown>): Promise<T[]> {
        // For now, just return empty array - can implement filtering later if needed
        return [];
    }
}