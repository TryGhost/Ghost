import {APIError, JSONError} from '@tryghost/admin-x-framework/errors';
import {describe, expect, it} from 'vitest';
import {extractYamlUploadError} from './yaml-upload-error';

const jsonError = (error: Partial<{message: string; context: string | null; help: string}>) => new JSONError(
    new Response(null, {status: 500}),
    {errors: [{message: '', context: null, help: '', code: '', details: null, ghostErrorCode: null, id: '1', property: null, type: 'InternalServerError', ...error}]} as never
);

describe('extractYamlUploadError', () => {
    it('shows the server message and its remediation hint together', () => {
        const error = jsonError({
            message: 'Could not save routes.yaml to storage: AccessDenied (PutObject).',
            context: 'Access Denied',
            help: 'Check the credentials and the bucket permissions.'
        });

        expect(extractYamlUploadError(error)).toBe(
            'Could not save routes.yaml to storage: AccessDenied (PutObject). Check the credentials and the bucket permissions.'
        );
    });

    it('falls back to the context when the server sent no message', () => {
        const error = jsonError({message: '', context: 'Access Denied', help: ''});

        expect(extractYamlUploadError(error)).toBe('Access Denied');
    });

    it('omits the hint when there is none', () => {
        const error = jsonError({message: 'Could not parse provided YAML file: bad indentation.', help: ''});

        expect(extractYamlUploadError(error)).toBe('Could not parse provided YAML file: bad indentation.');
    });

    it('falls back to the transport error for a non-JSON failure', () => {
        expect(extractYamlUploadError(new APIError(undefined, undefined, 'Network request failed'))).toBe('Network request failed');
    });

    it('returns a generic message for anything else', () => {
        expect(extractYamlUploadError(new Error('boom'))).toBe('Something went wrong, please try again.');
        expect(extractYamlUploadError(undefined)).toBe('Something went wrong, please try again.');
    });
});
