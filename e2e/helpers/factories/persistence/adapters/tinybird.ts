import type {PersistenceAdapter} from '../adapter';
import type {EntityRegistry, TinyBirdApiMetadata} from '../entity-registry';
import {FetchHttpClient, HttpClient} from '../../utils/http-client';

export class TinybirdPersistenceAdapter implements PersistenceAdapter {
    private httpClient: HttpClient;

    constructor(
        private config: { readonly host: string, readonly token: string },
        private registry: EntityRegistry<TinyBirdApiMetadata>,
        httpClient?: HttpClient
    ) {
        this.httpClient = httpClient ?? new FetchHttpClient();
    }

    async connect(): Promise<void> {}

    async disconnect(): Promise<void> {}

    async insert<T>(entityType: string, data: T): Promise<T> {
        const {endpoint} = this.registry.getMetadata(entityType);
        if (!endpoint) {
            throw new Error(`No endpoint configured for entity type: ${entityType}`);
        }

        const url = `${this.config.host}${endpoint}`;

        try {
            const response = await this.httpClient.fetch(url, {
                method: 'POST',
                headers: {
                    ...this.defaultApiHeader,
                    'x-site-uuid': (data as Record<string, unknown> & {payload?: {site_uuid?: string}}).payload?.site_uuid || ''
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Tinybird request failed: ${response.status} - ${text}`);
            } else {
                const text = await response.text();
                if (!text.includes('"quarantined_rows":0')) {
                    throw new Error(`Tinybird request failed: ${response.status} - ${text}`);
                }
            }

            return data;
        } catch (error) {
            // eslint-disable-next-line no-console
            console.warn('Tinybird error:', error instanceof Error ? error.message : String(error));
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

        const sqlUrl = `${this.config.host}/v0/sql`;
        const query = `DELETE FROM ${entityType} WHERE ${primaryKey} = '${id}'`;

        try {
            const response = await this.httpClient.fetch(sqlUrl, {
                method: 'POST',
                headers: this.defaultApiHeader,
                body: JSON.stringify({q: query})
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Failed to delete event: ${response.status} - ${text}`);
            }
        } catch (error) {
            throw error;
        }
    }

    async deleteMany(entityType: string, ids: string[]): Promise<void> {
        if (ids.length === 0) {
            return;
        }

        const {primaryKey = 'session_id'} = this.registry.getMetadata(entityType);

        const batchSize = 100;
        for (let i = 0; i < ids.length; i += batchSize) {
            const batch = ids.slice(i, i + batchSize);
            const idList = batch.map(id => `'${id}'`).join(',');

            const sqlUrl = `${this.config.host}/v0/sql`;
            const query = `DELETE FROM ${entityType} WHERE ${primaryKey} IN (${idList})`;

            try {
                const response = await this.httpClient.fetch(sqlUrl, {
                    method: 'POST',
                    headers: this.defaultApiHeader,
                    body: JSON.stringify({q: query})
                });

                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(`Failed to delete events: ${response.status} - ${text}`);
                }
            } catch (error) {
                throw error;
            }
        }
    }

    async find<T>(entityType: string, id: string): Promise<T | null> {
        void entityType;
        void id;
        throw new Error('Find by id is not supported for this endpoint.');
    }

    async findById<T>(entityType: string, id: string): Promise<T | null> {
        void entityType;
        void id;
        throw new Error('Find by id is not supported for this endpoint.');
    }

    async findMany<T>(entityType: string, query?: Record<string, unknown>): Promise<T[]> {
        void entityType;
        void query;
        throw new Error('Find by id is not supported for this endpoint.');
    }

    private get defaultApiHeader() {
        return {Authorization: `Bearer ${this.config.token}`, 'Content-Type': 'application/json'};
    }
}
