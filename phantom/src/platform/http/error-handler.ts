import type {Context} from 'hono';
import {ZodError} from 'zod';

export const handleError = (error: Error, context: Context) => {
    if (error instanceof ZodError) {
        return context.json({
            error: 'validation_error',
            details: error.flatten()
        }, 400);
    }

    return context.json({
        error: 'internal_error',
        message: 'Unexpected error'
    }, 500);
};
