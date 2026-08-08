import {APIError, JSONError} from '@tryghost/admin-x-framework/errors';
import {describe, expect, it} from 'vitest';
import {getYamlUploadError} from './yaml-upload-error';

const jsonError = (error: Partial<{message: string; context: unknown; help: string}>) => new JSONError(
    new Response(null, {status: 500}),
    {errors: [{message: '', context: null, help: '', code: '', details: null, ghostErrorCode: null, id: '1', property: null, type: 'InternalServerError', ...error}]} as never
);

describe('getYamlUploadError', () => {
    it('reports the server message with the cause and the remediation hint', () => {
        const error = jsonError({
            message: 'Could not save routes.yaml to storage: AccessDenied (PutObject).',
            context: 'Access Denied',
            help: 'The storage credentials Ghost is configured with are not allowed to perform this operation on the bucket.'
        });

        expect(getYamlUploadError(error)).toEqual({
            message: 'Could not save routes.yaml to storage: AccessDenied (PutObject).',
            detail: 'Access Denied\n\nThe storage credentials Ghost is configured with are not allowed to perform this operation on the bucket.'
        });
    });

    // The commonest failure by far. `message` only carries js-yaml's `reason`;
    // the line, column and pointer are in `context`, so dropping it would make
    // an invalid file harder to fix than before.
    it('keeps the line and column of a YAML parse error', () => {
        const error = jsonError({
            message: 'Could not parse provided YAML file: bad indentation of a mapping entry.',
            context: 'bad indentation of a mapping entry (3:7)\n\n 1 | routes:\n 2 |   /about/: about\n 3 |    bad: x\n-----------^',
            help: 'Check provided file for typos and fix the named issues.'
        });

        const result = getYamlUploadError(error);

        expect(result?.message).toBe('Could not parse provided YAML file: bad indentation of a mapping entry.');
        expect(result?.detail).toContain('(3:7)');
        expect(result?.detail).toContain('-----------^');
        expect(result?.detail).toContain('Check provided file for typos');
    });

    it('does not repeat a cause the message already contains', () => {
        const error = jsonError({message: 'Could not parse: bad indentation.', context: 'bad indentation.'});

        expect(getYamlUploadError(error)).toEqual({message: 'Could not parse: bad indentation.', detail: undefined});
    });

    it('falls back to the cause when the server sent no message', () => {
        expect(getYamlUploadError(jsonError({message: '', context: 'Access Denied'}))?.message).toBe('Access Denied');
    });

    // A couple of redirect validators put the offending object in `context`,
    // which React refuses to render.
    it('ignores a non-string cause', () => {
        const error = jsonError({message: 'Redirect is invalid.', context: {from: '/a', to: '/b'}});

        expect(getYamlUploadError(error)).toEqual({message: 'Redirect is invalid.', detail: undefined});
    });

    it('returns null when there is no API error body to read', () => {
        expect(getYamlUploadError(new APIError(undefined, undefined, 'Network request failed'))).toBeNull();
        expect(getYamlUploadError(new Error('boom'))).toBeNull();
        expect(getYamlUploadError(undefined)).toBeNull();
    });

    it('returns null when the error body says nothing', () => {
        expect(getYamlUploadError(jsonError({message: '', context: null, help: ''}))).toBeNull();
    });
});
