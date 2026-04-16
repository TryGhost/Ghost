import {JSONError} from '@tryghost/admin-x-framework/errors';
import {useCallback, useRef, useState} from 'react';

import {type WelcomeEmailDraft, getWelcomeEmailValidationErrors} from './welcome-email-validation';

export type WelcomeEmailPreview = {
    html: string;
    plaintext: string;
    subject: string;
};

export type WelcomeEmailPreviewResponse = {
    automated_emails?: WelcomeEmailPreview[];
};

export type WelcomeEmailPreviewState =
    | {status: 'idle'}
    | {status: 'loading'}
    | {status: 'success'; preview: WelcomeEmailPreview}
    | {status: 'error'; message: string}
    | {status: 'invalid'; message: string};

export type WelcomeEmailPreviewFrameState =
    | {status: 'loading'}
    | {status: 'success'; html: string}
    | {status: 'error' | 'invalid'; message: string};

const preparePreviewHtml = (html: string) => {
    if (typeof DOMParser === 'undefined') {
        return html;
    }

    const parser = new DOMParser();
    const parsed = parser.parseFromString(html, 'text/html');

    parsed.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((link) => {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
    });

    return `<!doctype html>${parsed.documentElement.outerHTML}`;
};

const getPreviewErrorMessage = (error: unknown) => {
    const fallbackMessage = 'Failed to render preview';

    if (error instanceof JSONError && error.data?.errors?.[0]) {
        return error.data.errors[0].context || error.data.errors[0].message || fallbackMessage;
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }

    return fallbackMessage;
};

export const useWelcomeEmailPreview = ({automatedEmailId, previewWelcomeEmail, setErrors}: {
    automatedEmailId: string;
    previewWelcomeEmail: (payload: WelcomeEmailDraft & {id: string}) => Promise<WelcomeEmailPreviewResponse>;
    setErrors: (errors: Record<string, string>) => void;
}) => {
    const [previewState, setPreviewState] = useState<WelcomeEmailPreviewState>({status: 'idle'});
    const previewRequestIdRef = useRef(0);

    const exitPreview = useCallback(() => {
        previewRequestIdRef.current += 1;
        setPreviewState({status: 'idle'});
    }, []);

    const runPreview = useCallback(async (draft: WelcomeEmailDraft) => {
        const requestId = previewRequestIdRef.current + 1;
        previewRequestIdRef.current = requestId;

        const validationErrors = getWelcomeEmailValidationErrors(draft);
        setErrors(validationErrors);

        const hasValidationErrors = Boolean(validationErrors.subject || validationErrors.lexical);
        if (hasValidationErrors) {
            setPreviewState({
                status: 'invalid',
                message: validationErrors.subject || validationErrors.lexical
            });
            return;
        }

        setPreviewState({status: 'loading'});

        try {
            // Only the latest preview request is allowed to update preview state.
            const response = await previewWelcomeEmail({
                id: automatedEmailId,
                subject: draft.subject,
                lexical: draft.lexical
            });

            if (previewRequestIdRef.current !== requestId) {
                return;
            }

            const preview = response.automated_emails?.[0];

            if (!preview?.html || !preview?.plaintext || !preview?.subject) {
                throw new Error('Preview response was incomplete');
            }

            setPreviewState({
                status: 'success',
                preview: {
                    ...preview,
                    html: preparePreviewHtml(preview.html)
                }
            });
        } catch (error) {
            if (previewRequestIdRef.current !== requestId) {
                return;
            }

            setPreviewState({
                status: 'error',
                message: getPreviewErrorMessage(error)
            });
        }
    }, [automatedEmailId, previewWelcomeEmail, setErrors]);

    const enterPreview = useCallback((draft: WelcomeEmailDraft) => {
        runPreview(draft);
    }, [runPreview]);

    return {
        previewFrameState:
            previewState.status === 'success'
                ? {status: 'success' as const, html: previewState.preview.html}
                : previewState.status === 'error' || previewState.status === 'invalid'
                    ? {status: previewState.status, message: previewState.message}
                    : {status: 'loading' as const},
        previewState,
        enterPreview,
        exitPreview
    };
};
