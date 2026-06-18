import type {Context, Hono} from 'hono';

type Handler = (context: Context) => Response | Promise<Response>;

// Hono's strict-mode option does not survive sub-app mounting, so compat
// routes register both slash variants: Ghost clients use both forms.
export const slashTolerant = (router: Hono) => {
    const register = (method: 'get' | 'post' | 'delete') => {
        return (path: string, handler: Handler) => {
            router[method](path, handler);
            if (path.endsWith('/') && path !== '/') {
                router[method](path.slice(0, -1), handler);
            }
            return router;
        };
    };
    return {
        get: register('get'),
        post: register('post'),
        delete: register('delete')
    };
};
