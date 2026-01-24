import {OpenAPIHono} from '@hono/zod-openapi';

export const createOpenApiRouter = () => {
    return new OpenAPIHono({
        defaultHook: (result, context) => {
            if (!result.success) {
                return context.json({
                    error: 'validation_error',
                    details: result.error.flatten()
                }, 400);
            }

            return undefined;
        }
    });
};
