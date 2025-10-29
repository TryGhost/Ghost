import {HttpClient} from './http-client';
import {PersistenceAdapter} from '../adapter';

interface ApiAdapterOptions<TRequest = unknown, TResponse = unknown> {
    httpClient: HttpClient;
    endpoint: string;
    queryParams?: Record<string, string>;
    transformRequest?: (data: TRequest) => unknown;
    transformResponse?: (response: TResponse) => unknown;
}

/**
 * Generic API persistence adapter that works with any HTTP client
 * Note: The HTTP client must handle authentication (cookies, tokens, etc.)
 * For Playwright tests, the client should preserve the BrowserContext's auth state
 */
export class ApiPersistenceAdapter<TRequest = unknown, TResponse = unknown> implements PersistenceAdapter {
    protected httpClient: HttpClient;
    protected endpoint: string;
    protected queryParams: Record<string, string>;
    protected transformRequest: (data: TRequest) => unknown;
    protected transformResponse: (response: TResponse) => unknown;

    constructor(options: ApiAdapterOptions<TRequest, TResponse>) {
        this.httpClient = options.httpClient;
        this.endpoint = options.endpoint;
        this.queryParams = options.queryParams || {};
        this.transformRequest = options.transformRequest || ((data: TRequest) => data as unknown);
        this.transformResponse = options.transformResponse || ((response: TResponse) => response as unknown);
    }

    protected buildUrl(path?: string): string {
        const url = path ? `${this.endpoint}/${path}` : this.endpoint;
        const params = new URLSearchParams(this.queryParams);
        const queryString = params.toString();
        return queryString ? `${url}?${queryString}` : url;
    }

    async insert<T>(entityType: string, data: T): Promise<T> {
        const response = await this.httpClient.post(this.buildUrl(), {
            data: this.transformRequest(data as unknown as TRequest)
        });

        if (!response.ok()) {
            const errorBody = await response.json().catch(() => null);
            const errorMessage = errorBody ? JSON.stringify(errorBody) : '';
            throw new Error(`Failed to create ${entityType}: ${response.status()} ${errorMessage}`);
        }

        const body = await response.json() as TResponse;
        return this.transformResponse(body) as T;
    }

    async findById<T>(entityType: string, id: string): Promise<T> {
        const response = await this.httpClient.get(this.buildUrl(id));

        if (response.status() === 404) {
            throw new Error(`${entityType} with id ${id} not found`);
        }

        if (!response.ok()) {
            throw new Error(`Failed to find ${entityType}: ${response.status()}`);
        }

        const body = await response.json() as TResponse;
        return this.transformResponse(body) as T;
    }

    async update<T>(entityType: string, id: string, data: Partial<T>): Promise<T> {
        const existing = await this.findById<T>(entityType, id);

        const response = await this.httpClient.put(this.buildUrl(id), {
            data: this.transformRequest({...existing, ...data} as unknown as TRequest)
        });

        if (!response.ok()) {
            throw new Error(`Failed to update ${entityType}: ${response.status()}`);
        }

        const body = await response.json() as TResponse;
        return this.transformResponse(body) as T;
    }

    async delete(entityType: string, id: string): Promise<void> {
        const response = await this.httpClient.delete(this.buildUrl(id));

        if (!response.ok() && response.status() !== 404) {
            throw new Error(`Failed to delete ${entityType}: ${response.status()}`);
        }
    }
}
