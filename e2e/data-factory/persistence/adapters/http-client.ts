// HTTP client interface that matches Playwright's API but isn't coupled to it
export interface HttpResponse {
    ok(): boolean;
    status(): number;
    json(): Promise<unknown>;
}

// Generic HTTP client interface that works with any response type that has the required methods
export interface HttpClient<TResponse extends HttpResponse = HttpResponse> {
    get(url: string, options?: {headers?: Record<string, string>}): Promise<TResponse>;
    post(url: string, options?: {data?: unknown; headers?: Record<string, string>}): Promise<TResponse>;
    put(url: string, options?: {data?: unknown; headers?: Record<string, string>}): Promise<TResponse>;
    delete(url: string, options?: {headers?: Record<string, string>}): Promise<TResponse>;
}
