import * as assert from 'assert/strict';
import {JSONError} from '@tryghost/admin-x-framework/errors';
import {act, renderHook, waitFor} from '@testing-library/react';
import {useWelcomeEmailPreview} from '@src/hooks/use-welcome-email-preview';

const validLexical = JSON.stringify({
    root: {
        children: [{
            type: 'paragraph',
            children: [{
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
                text: 'Welcome!',
                type: 'text',
                version: 1
            }],
            direction: 'ltr',
            format: '',
            indent: 0,
            version: 1
        }],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'root',
        version: 1
    }
});

const createDeferred = <T,>() => {
    let resolve!: (value: T) => void;
    let reject!: (error?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });

    return {promise, resolve, reject};
};

describe('useWelcomeEmailPreview', function () {
    it('returns invalid state and skips network for invalid drafts', async function () {
        const previewWelcomeEmail = vi.fn();
        const setErrors = vi.fn();
        const {result} = renderHook(() => useWelcomeEmailPreview({
            automatedEmailId: 'welcome-email-id',
            previewWelcomeEmail,
            setErrors
        }));

        act(() => {
            result.current.enterPreview({subject: '   ', lexical: ''});
        });

        assert.equal(previewWelcomeEmail.mock.calls.length, 0);
        assert.equal(result.current.previewState.status, 'invalid');
        assert.equal(result.current.previewState.message, 'A subject is required');
        assert.deepEqual(setErrors.mock.calls[0][0], {
            subject: 'A subject is required',
            lexical: 'Email content is required'
        });
    });

    it('keeps the latest preview response when requests resolve out of order', async function () {
        const firstPreview = createDeferred<{automated_emails: [{html: string; plaintext: string; subject: string}]}>();
        const secondPreview = createDeferred<{automated_emails: [{html: string; plaintext: string; subject: string}]}>();
        const previewWelcomeEmail = vi
            .fn()
            .mockImplementationOnce(() => firstPreview.promise)
            .mockImplementationOnce(() => secondPreview.promise);
        const {result} = renderHook(() => useWelcomeEmailPreview({
            automatedEmailId: 'welcome-email-id',
            previewWelcomeEmail,
            setErrors: vi.fn()
        }));

        act(() => {
            result.current.enterPreview({subject: 'First', lexical: validLexical});
            result.current.enterPreview({subject: 'Second', lexical: validLexical});
        });

        await act(async () => {
            secondPreview.resolve({
                automated_emails: [{
                    html: '<!doctype html><html><body><p>Second</p></body></html>',
                    plaintext: 'Second',
                    subject: 'Second subject'
                }]
            });
            await secondPreview.promise;
        });

        await waitFor(() => {
            assert.equal(result.current.previewState.status, 'success');
            assert.equal(result.current.previewState.preview.subject, 'Second subject');
        });

        await act(async () => {
            firstPreview.resolve({
                automated_emails: [{
                    html: '<!doctype html><html><body><p>First</p></body></html>',
                    plaintext: 'First',
                    subject: 'First subject'
                }]
            });
            await firstPreview.promise;
        });

        await waitFor(() => {
            assert.equal(result.current.previewState.status, 'success');
            assert.equal(result.current.previewState.preview.subject, 'Second subject');
        });
    });

    it('maps API errors to error state messages', async function () {
        const previewWelcomeEmail = vi.fn().mockRejectedValue(new JSONError(
            new Response('{}', {status: 500, headers: {'content-type': 'application/json'}}),
            {
                errors: [{
                    code: 'UNKNOWN',
                    context: 'Preview failed on the server',
                    details: null,
                    ghostErrorCode: null,
                    help: '',
                    id: '1',
                    message: 'Preview failed',
                    property: null,
                    type: 'InternalServerError'
                }]
            }
        ));
        const {result} = renderHook(() => useWelcomeEmailPreview({
            automatedEmailId: 'welcome-email-id',
            previewWelcomeEmail,
            setErrors: vi.fn()
        }));

        act(() => {
            result.current.enterPreview({subject: 'Welcome', lexical: validLexical});
        });

        await waitFor(() => {
            assert.equal(result.current.previewState.status, 'error');
            assert.equal(result.current.previewState.message, 'Preview failed on the server');
        });
    });

    it('transforms preview HTML and returns success state', async function () {
        const previewWelcomeEmail = vi.fn().mockResolvedValue({
            automated_emails: [{
                html: '<!doctype html><html><body><a href="https://example.com">Preferences</a></body></html>',
                plaintext: 'Preferences',
                subject: 'Preview subject'
            }]
        });
        const {result} = renderHook(() => useWelcomeEmailPreview({
            automatedEmailId: 'welcome-email-id',
            previewWelcomeEmail,
            setErrors: vi.fn()
        }));

        act(() => {
            result.current.enterPreview({subject: 'Welcome', lexical: validLexical});
        });

        await waitFor(() => {
            assert.equal(result.current.previewState.status, 'success');
            assert.equal(result.current.previewState.preview.subject, 'Preview subject');
            assert.match(result.current.previewState.preview.html, /target="_blank"/);
            assert.match(result.current.previewState.preview.html, /rel="noopener noreferrer"/);
        });
    });
});
