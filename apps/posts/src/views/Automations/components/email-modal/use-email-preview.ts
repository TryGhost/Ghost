import {JSONError} from '@tryghost/admin-x-framework/errors';
import {useCallback, useEffect, useRef, useState} from 'react';

import {type EmailDraft, getEmailValidationErrors} from './validation';

export type EmailPreview = {
    html: string;
    plaintext: string;
    subject: string;
};

export type EmailPreviewResponse = {
    automated_emails?: EmailPreview[];
};

export type EmailPreviewState =
    | {status: 'idle'}
    | {status: 'loading'}
    | {status: 'success'; preview: EmailPreview}
    | {status: 'error'; message: string}
    | {status: 'invalid'; message: string};

export type EmailPreviewFrameState =
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

const PREVIEW_UNAVAILABLE_MESSAGE = 'Preview is currently unavailable';

export const useEmailPreview = ({automatedEmailId, isAutomatedEmailIdResolving, previewWelcomeEmail, setErrors}: {
    automatedEmailId: string;
    isAutomatedEmailIdResolving: boolean;
    previewWelcomeEmail: (payload: EmailDraft & {id: string}) => Promise<EmailPreviewResponse>;
    setErrors: (errors: Record<string, string>) => void;
}) => {
    const [previewState, setPreviewState] = useState<EmailPreviewState>({status: 'idle'});
    const previewRequestIdRef = useRef(0);
    // Preview/test borrow an automated-email id that may still be loading. Hold the
    // requested draft until the id resolves, then flush it (or surface an error if it
    // never arrives) rather than firing a request with an empty id.
    const pendingDraftRef = useRef<EmailDraft | null>(null);

    const runPreview = useCallback(async (draft: EmailDraft, id: string) => {
        const requestId = previewRequestIdRef.current + 1;
        previewRequestIdRef.current = requestId;

        setErrors({});
        setPreviewState({status: 'loading'});

        try {
            // Only the latest preview request is allowed to update preview state.
            const response = await previewWelcomeEmail({
                id,
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
    }, [previewWelcomeEmail, setErrors]);

    const exitPreview = useCallback(() => {
        previewRequestIdRef.current += 1;
        pendingDraftRef.current = null;
        setPreviewState({status: 'idle'});
        setErrors({});
    }, [setErrors]);

    const enterPreview = useCallback((draft: EmailDraft) => {
        const validationErrors = getEmailValidationErrors(draft);
        if (validationErrors.lexical) {
            pendingDraftRef.current = null;
            setErrors({lexical: validationErrors.lexical});
            setPreviewState({
                status: 'invalid',
                message: validationErrors.lexical
            });
            return;
        }

        if (!automatedEmailId) {
            // Defer while the id is still loading; once it has settled without one,
            // there is nothing to wait for, so surface an error instead of spinning.
            if (isAutomatedEmailIdResolving) {
                pendingDraftRef.current = draft;
                setErrors({});
                setPreviewState({status: 'loading'});
                return;
            }

            pendingDraftRef.current = null;
            setErrors({});
            setPreviewState({status: 'error', message: PREVIEW_UNAVAILABLE_MESSAGE});
            return;
        }

        pendingDraftRef.current = null;
        void runPreview(draft, automatedEmailId);
    }, [automatedEmailId, isAutomatedEmailIdResolving, runPreview, setErrors]);

    // Flush (or fail) a deferred request once the borrowed id resolves.
    useEffect(() => {
        if (!pendingDraftRef.current) {
            return;
        }

        if (automatedEmailId) {
            const draft = pendingDraftRef.current;
            pendingDraftRef.current = null;
            void runPreview(draft, automatedEmailId);
        } else if (!isAutomatedEmailIdResolving) {
            pendingDraftRef.current = null;
            setPreviewState({status: 'error', message: PREVIEW_UNAVAILABLE_MESSAGE});
        }
    }, [automatedEmailId, isAutomatedEmailIdResolving, runPreview]);

    let previewFrameState: EmailPreviewFrameState = {status: 'loading'};

    if (previewState.status === 'success') {
        previewFrameState = {status: 'success', html: previewState.preview.html};
    } else if (previewState.status === 'error' || previewState.status === 'invalid') {
        previewFrameState = {status: previewState.status, message: previewState.message};
    }

    return {
        previewFrameState,
        previewState,
        enterPreview,
        exitPreview
    };
};
