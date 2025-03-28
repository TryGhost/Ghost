import {ArgumentsHost, Catch, ExceptionFilter, Inject} from '@nestjs/common';
import {Response} from 'express';

interface GhostError extends Error {
    statusCode?: number;
    context?: string;
    errorType?: string;
    errorDetails?: string;
    property?: string;
    help?: string;
    code?: string;
    id?: string;
    ghostErrorCode?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    constructor(@Inject('logger') private logger: Console) {}

    catch(error: GhostError, host: ArgumentsHost) {
        const context = host.switchToHttp();
        const response = context.getResponse<Response>();

        this.logger.error(error);

        response.status(error.statusCode || 500);
        response.json({
            errors: [
                {
                    message: error.message,
                    context: error.context || null,
                    type: error.errorType || null,
                    details: error.errorDetails || null,
                    property: error.property || null,
                    help: error.help || null,
                    code: error.code || null,
                    id: error.id || null,
                    ghostErrorCode: error.ghostErrorCode || null
                }
            ]
        });
    }
}

/*
function prepareError(err: unknown) {
    if (Array.isArray(err)) {
        err = err[0];
    }

    // If the error is already a GhostError, it has been handled and can be returned as-is
    // For everything else, we do some custom handling here
    if (errors.utils.isGhostError(err)) {
        return err;
    }

    if (!(err instanceof Error)) {
        return new errors.InternalServerError({
            err: err,
            message: tpl(messages.genericError),
            context: err.message,
            statusCode: err.statusCode,
            code: 'UNEXPECTED_ERROR'
        });
    }

    // Catch bookshelf empty errors and other 404s, and turn into a Ghost 404
    if (
        (err.statusCode && err.statusCode === 404) ||
        err.message === 'EmptyResponse'
    ) {
        return new errors.NotFoundError({
            err: err
        });
        // Catch handlebars / express-hbs errors, and render them as 400, rather than 500 errors as the server isn't broken
    } else if (
        isDependencyInStack('handlebars', err) ||
        isDependencyInStack('express-hbs', err)
    ) {
        // Temporary handling of theme errors from handlebars
        // @TODO remove this when #10496 is solved properly
        err = new errors.IncrrectUsageError({
            err: err,
            message: err.message,
            statusCode: err.statusCode
        });
        // Catch database errors and turn them into 500 errors, but log some useful data to sentry
    } else if (isDependencyInStack('mysql2', err)) {
        // we don't want to return raw database errors to our users
        err.sqlErrorCode = err.code;
        err = new errors.InternalServerError({
            err: err,
            message: tpl(messages.genericError),
            statusCode: err.statusCode,
            code: 'UNEXPECTED_ERROR'
        });
        // For everything else, create a generic 500 error, with context set to the original error message
    } else {
        err = new errors.InternalServerError({
            err: err,
            message: tpl(messages.genericError),
            context: err.message,
            statusCode: err.statusCode,
            code: 'UNEXPECTED_ERROR'
        });
    }
}
*/
