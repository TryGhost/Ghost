import type {Context} from 'hono';
import {ZodError} from 'zod';
import {HttpError} from './errors.js';

export const handleError = (error: Error, context: Context) => {
    console.error(error);
    if (error instanceof ZodError) {
        return context.json({
            error: 'validation_error',
            details: error.flatten()
        }, {status: 400});
    }

    if (error instanceof HttpError) {
        return context.json({
            error: error.code,
            message: error.message
        }, {status: error.status});
    }

    return context.json({
        error: 'internal_error',
        message: 'Unexpected error'
    }, {status: 500});
};
