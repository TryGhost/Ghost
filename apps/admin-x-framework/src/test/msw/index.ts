import {DefaultBodyType, HttpResponse, PathParams, RequestHandler, http} from 'msw';
import {setupServer} from 'msw/node';
import {responseFixtures} from '../acceptance';

// Re-export the msw objects
export {http, HttpResponse};

/**
 * Types for handler creation
 */
export type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch';
export type HandlerOptions = {
    status?: number;
    delay?: number;
};

/**
 * Handler creation functions
 */
export function createHandler<T = DefaultBodyType>(
    method: HttpMethod,
    path: string | RegExp,
    responseData: T,
    options: HandlerOptions = {}
) {
    return http[method](path, async () => {
        // Apply delay if specified
        if (options.delay !== undefined && options.delay > 0) {
            await new Promise(resolve => setTimeout(resolve, options.delay));
        }
        
        // Create the response with appropriate status code
        return HttpResponse.json(responseData as DefaultBodyType, {
            status: options.status || (method === 'post' ? 201 : 200)
        });
    });
}

/**
 * Shorthand methods for common HTTP methods
 */
export const get = <T>(path: string | RegExp, responseData: T, options?: HandlerOptions) => createHandler('get', path, responseData, options);

export const post = <T>(path: string | RegExp, responseData: T, options?: HandlerOptions) => createHandler('post', path, responseData, options);

export const put = <T>(path: string | RegExp, responseData: T, options?: HandlerOptions) => createHandler('put', path, responseData, options);

export const del = <T>(path: string | RegExp, responseData: T, options?: HandlerOptions) => createHandler('delete', path, responseData, options);

export const patch = <T>(path: string | RegExp, responseData: T, options?: HandlerOptions) => createHandler('patch', path, responseData, options);

/**
 * Create an error response handler
 */
export function createErrorHandler(
    method: HttpMethod,
    path: string | RegExp,
    errorMessage: string,
    status: number = 400
) {
    return http[method](path, () => {
        return HttpResponse.json(
            {
                errors: [{
                    message: errorMessage
                }]
            },
            {status}
        );
    });
}

/**
 * Create a handler with a dynamic response based on the request
 */
export function createDynamicHandler<T = DefaultBodyType, P extends PathParams = PathParams>(
    method: HttpMethod,
    path: string | RegExp,
    handler: (params: {request: Request, params: P}) => Promise<T> | T,
    options: HandlerOptions = {}
) {
    return http[method]<P>(path, async ({request, params}) => {
        // Apply delay if specified
        if (options.delay !== undefined && options.delay > 0) {
            await new Promise(resolve => setTimeout(resolve, options.delay));
        }
        
        const responseData = await handler({request, params});
        
        // Create the response with appropriate status code
        return HttpResponse.json(responseData as DefaultBodyType, {
            status: options.status || (method === 'post' ? 201 : 200)
        });
    });
}

/**
 * Create a set of common Ghost API handlers using the fixture data
 */
export function createGhostAPIHandlers() {
    return [
        // Settings
        get('/ghost/api/admin/settings/', responseFixtures.settings),
        
        // Users
        get('/ghost/api/admin/users/', responseFixtures.users),
        
        // Current user (me)
        get('/ghost/api/admin/users/me/', responseFixtures.me),
        
        // Roles
        get('/ghost/api/admin/roles/', responseFixtures.roles),
        
        // Site
        get('/ghost/api/admin/site/', responseFixtures.site),
        
        // Config
        get('/ghost/api/admin/config/', responseFixtures.config),
        
        // Invites
        get('/ghost/api/admin/invites/', responseFixtures.invites),
        
        // Custom Theme Settings
        get('/ghost/api/admin/custom_theme_settings/', responseFixtures.customThemeSettings),
        
        // Tiers
        get('/ghost/api/admin/tiers/', responseFixtures.tiers),
        
        // Labels
        get('/ghost/api/admin/labels/', responseFixtures.labels),
        
        // Offers
        get('/ghost/api/admin/offers/', responseFixtures.offers),
        
        // Themes
        get('/ghost/api/admin/themes/', responseFixtures.themes),
        
        // Newsletters
        get('/ghost/api/admin/newsletters/', responseFixtures.newsletters),
        
        // Actions
        get('/ghost/api/admin/actions/', responseFixtures.actions),
        
        // Recommendations
        get('/ghost/api/admin/recommendations/', responseFixtures.recommendations),
        
        // Incoming Recommendations
        get('/ghost/api/admin/recommendations/incoming/', responseFixtures.incomingRecommendations)
    ];
}

/**
 * Create ActivityPub API handlers
 */
export function createActivityPubHandlers() {
    return [
        get('/activitypub/inbox/', responseFixtures.activitypubInbox),
        get('/activitypub/feed/', responseFixtures.activitypubFeed)
    ];
}

/**
 * Create a MSW server with preset handlers
 */
export function createServer(handlers: RequestHandler[]) {
    return setupServer(...handlers);
}

/**
 * Setup a default server for testing with common Ghost API handlers
 */
export const createDefaultServer = () => createServer([
    ...createGhostAPIHandlers(),
    ...createActivityPubHandlers()
]);

/**
 * Helper function to create a test setup with MSW
 */
export function createMockAPI() {
    const server = createDefaultServer();
    
    // Start the MSW server before tests
    const setup = () => server.listen();
    
    // Clean up after each test
    const teardown = () => server.close();
    
    // Reset handlers between tests (if needed)
    const reset = () => server.resetHandlers();
    
    return {
        server,
        setup,
        teardown,
        reset
    };
}

// Export a pre-configured API mock
export const mockAPI = createMockAPI(); 