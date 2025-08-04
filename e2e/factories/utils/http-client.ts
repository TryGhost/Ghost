export interface HttpClient {
    fetch(url: string, options?: RequestInit): Promise<Response>;
}

// Default implementation using global fetch
export class FetchHttpClient implements HttpClient {
    async fetch(url: string, options?: RequestInit): Promise<Response> {
        return fetch(url, options);
    }
}
