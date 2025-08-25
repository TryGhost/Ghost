import {appConfig} from '../../helpers/utils/app-config';

/**
 * API client for Ghost Admin API that works with Playwright's fetch
 * Uses session cookies for authentication
 */
export class GhostApiClient {
    private baseURL: string;
    private sessionCookie?: string;
    
    constructor(baseURL: string = appConfig.baseURL) {
        this.baseURL = baseURL;
    }
    
    /**
     * Authenticate with Ghost Admin API using email/password
     */
    async authenticate(email: string = appConfig.auth.email, password: string = appConfig.auth.password): Promise<void> {
        const response = await fetch(`${this.baseURL}/ghost/api/admin/session/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                grant_type: 'password',
                username: email,
                password: password
            })
        });
        
        if (!response.ok) {
            throw new Error(`Authentication failed: ${response.status}`);
        }
        
        // Extract session cookie from response headers
        const setCookie = response.headers.get('set-cookie');
        if (setCookie) {
            // Parse the ghost-admin-api-session cookie
            const match = setCookie.match(/ghost-admin-api-session=([^;]+)/);
            if (match) {
                this.sessionCookie = match[0];
            }
        }
    }
    
    /**
     * Make an authenticated request to the Ghost API
     */
    async request(path: string, options: RequestInit = {}): Promise<Response> {
        if (!this.sessionCookie) {
            throw new Error('Not authenticated. Call authenticate() first.');
        }
        
        const url = path.startsWith('http') ? path : `${this.baseURL}${path}`;
        
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                Cookie: this.sessionCookie,
                ...options.headers
            }
        });
        
        return response;
    }
    
    async get(path: string): Promise<any> {
        const response = await this.request(path, {method: 'GET'});
        return response.json();
    }
    
    post(path: string): RequestBuilder {
        return new RequestBuilder(this, 'POST', path);
    }
    
    put(path: string): RequestBuilder {
        return new RequestBuilder(this, 'PUT', path);
    }
    
    delete(path: string): RequestBuilder {
        return new RequestBuilder(this, 'DELETE', path);
    }
}

/**
 * Request builder to match the supertest-like API
 */
class RequestBuilder {
    private client: GhostApiClient;
    private method: string;
    private path: string;
    private bodyData?: any;
    private expectedStatus?: number;
    
    constructor(client: GhostApiClient, method: string, path: string) {
        this.client = client;
        this.method = method;
        this.path = path;
    }
    
    body(data: any): RequestBuilder {
        this.bodyData = data;
        return this;
    }
    
    expect(status: number): RequestBuilder {
        this.expectedStatus = status;
        return this;
    }
    
    async then(resolve: (value: any) => void, reject?: (error: any) => void): Promise<void> {
        try {
            const response = await this.client.request(this.path, {
                method: this.method,
                body: this.bodyData ? JSON.stringify(this.bodyData) : undefined
            });
            
            if (this.expectedStatus && response.status !== this.expectedStatus) {
                throw new Error(`Expected status ${this.expectedStatus}, got ${response.status}`);
            }
            
            const result = {
                status: response.status,
                body: response.status !== 204 ? await response.json() : null
            };
            
            resolve(result);
        } catch (error) {
            if (reject) {
                reject(error);
            } else {
                throw error;
            }
        }
    }
}