import type {PersistenceAdapter} from '../adapter';

interface ApiAdapterOptions {
    agent: any; // HTTP agent (e.g., supertest agent)
    endpoint: string;
    wrapRequest: (data: any) => any;
    extractResponse: (response: any) => any;
}

/**
 * Generic API persistence adapter for REST APIs
 * 
 * This adapter allows factories to persist data through REST APIs
 * instead of direct database access, ensuring proper model layer
 * integration and cache invalidation.
 */
export class ApiPersistenceAdapter implements PersistenceAdapter {
    private agent: any;
    private endpoint: string;
    private wrapRequest: (data: any) => any;
    private extractResponse: (response: any) => any;
    
    constructor(options: ApiAdapterOptions) {
        this.agent = options.agent;
        this.endpoint = options.endpoint;
        this.wrapRequest = options.wrapRequest;
        this.extractResponse = options.extractResponse;
    }
    
    async insert<T>(entityType: string, data: T): Promise<T> {
        // entityType parameter is ignored - we use the configured endpoint
        const response = await this.agent
            .post(this.endpoint)
            .body(this.wrapRequest(data))
            .expect(201);
        
        return this.extractResponse(response.body);
    }
    
    async update<T>(entityType: string, id: string, data: Partial<T>): Promise<T> {
        const response = await this.agent
            .put(`${this.endpoint}/${id}`)
            .body(this.wrapRequest(data))
            .expect(200);
        
        return this.extractResponse(response.body);
    }
    
    async delete(entityType: string, id: string): Promise<void> {
        await this.agent
            .delete(`${this.endpoint}/${id}`)
            .expect(204);
    }
    
    async deleteMany(entityType: string, ids: string[]): Promise<void> {
        // Most APIs don't support bulk delete, so we delete one by one
        for (const id of ids) {
            await this.delete(entityType, id);
        }
    }
    
    async findById<T>(entityType: string, id: string): Promise<T | null> {
        try {
            const response = await this.agent
                .get(`${this.endpoint}/${id}`)
                .expect(200);
            
            return this.extractResponse(response.body);
        } catch (error: any) {
            if (error.status === 404) {
                return null;
            }
            throw error;
        }
    }
    
    async findMany<T>(entityType: string, query?: Record<string, unknown>): Promise<T[]> {
        let url = this.endpoint;
        
        if (query && Object.keys(query).length > 0) {
            const params = new URLSearchParams();
            Object.entries(query).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    params.append(key, String(value));
                }
            });
            url = `${this.endpoint}?${params.toString()}`;
        }
        
        const response = await this.agent
            .get(url)
            .expect(200);
        
        const result = this.extractResponse(response.body);
        
        // Ensure we always return an array
        return Array.isArray(result) ? result : [result];
    }
}