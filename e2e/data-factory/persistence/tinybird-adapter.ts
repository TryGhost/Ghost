import type {PersistenceAdapter, EntityRegistry} from './types';
import type {TinybirdConfig, HttpClient} from '../plugins/tinybird/interfaces';
import {FetchHttpClient} from '../plugins/tinybird/interfaces';

/**
 * Tinybird-based persistence adapter for API access
 */
export class TinybirdPersistenceAdapter implements PersistenceAdapter {
    private httpClient: HttpClient;
    
    constructor(
        private config: TinybirdConfig,
        private registry: EntityRegistry,
        httpClient?: HttpClient
    ) {
        this.httpClient = httpClient ?? new FetchHttpClient();
    }
    
    async insert<T>(entityType: string, data: T): Promise<T> {
        const {endpoint} = this.registry.getMetadata(entityType);
        if (!endpoint) {
            throw new Error(`No endpoint configured for entity type: ${entityType}`);
        }
        
        // For Tinybird, we send to the events API
        const url = `${this.config.host}${endpoint}`;
        
        try {
            const response = await this.httpClient.fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.config.token}`,
                    'x-site-uuid': (data as Record<string, unknown> & {payload?: {site_uuid?: string}}).payload?.site_uuid || ''
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Tinybird request failed: ${response.status} - ${text}`);
            }
            
            return data;
        } catch (error) {
            // Log the error for debugging
            // eslint-disable-next-line no-console
            console.warn('Tinybird error:', error instanceof Error ? error.message : String(error));
            
            // For e2e tests, we should actually fail if Tinybird is not available
            // This ensures tests are meaningful
            throw error;
        }
    }
    
    async update<T>(_entityType: string, _id: string, _data: Partial<T>): Promise<T> {
        void _entityType;
        void _id;
        void _data;
        throw new Error('Update not supported for Tinybird events');
    }
    
    async delete(entityType: string, id: string): Promise<void> {
        const {primaryKey = 'session_id'} = this.registry.getMetadata(entityType);
        
        // Use Tinybird SQL endpoint to delete
        const sqlUrl = `${this.config.host}/v0/sql`;
        const query = `DELETE FROM ${entityType} WHERE ${primaryKey} = '${id}'`;
        
        try {
            const response = await this.httpClient.fetch(sqlUrl, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.config.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({q: query})
            });
            
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Failed to delete event: ${response.status} - ${text}`);
            }
        } catch (error) {
            // For e2e tests, we should actually fail if Tinybird is not available
            // This ensures tests are meaningful
            throw error;
        }
    }
    
    async deleteMany(entityType: string, ids: string[]): Promise<void> {
        if (ids.length === 0) {
            return;
        }
        
        const {primaryKey = 'session_id'} = this.registry.getMetadata(entityType);
        
        // Delete in batches using SQL endpoint
        const batchSize = 100;
        for (let i = 0; i < ids.length; i += batchSize) {
            const batch = ids.slice(i, i + batchSize);
            const idList = batch.map(id => `'${id}'`).join(',');
            
            const sqlUrl = `${this.config.host}/v0/sql`;
            const query = `DELETE FROM ${entityType} WHERE ${primaryKey} IN (${idList})`;
            
            try {
                const response = await this.httpClient.fetch(sqlUrl, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${this.config.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({q: query})
                });
                
                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(`Failed to delete events: ${response.status} - ${text}`);
                }
            } catch (error) {
                // For e2e tests, we should actually fail if Tinybird is not available
                // This ensures tests are meaningful
                throw error;
            }
        }
    }
    
    async findById<T>(_entityType: string, _id: string): Promise<T | null> {
        void _entityType;
        void _id;
        // Tinybird doesn't support individual event retrieval in the same way
        throw new Error('FindById not supported for Tinybird events');
    }
    
    async findMany<T>(_entityType: string, _query?: Record<string, unknown>): Promise<T[]> {
        void _entityType;
        void _query;
        // Tinybird queries would use their SQL API, not implemented for now
        throw new Error('FindMany not supported for Tinybird events');
    }
}