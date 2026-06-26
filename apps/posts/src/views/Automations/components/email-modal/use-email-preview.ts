import {JSONError} from '@tryghost/admin-x-framework/errors';
import {useRef, useState} from 'react';

import {type EmailDraft, getEmailValidationErrors} from './validation';

export type EmailPreview = {
    html: string;
    plaintext: string;
    subject: string;
};

export type EmailPreviewResponse = {
    automation_email_previews?: EmailPreview[];
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

export const useEmailPreview = ({automationId, previewAutomationEmail, setErrors}: {
    automationId: string;
    previewAutomationEmail: (payload: EmailDraft & {id: string}) => Promise<EmailPreviewResponse>;
    setErrors: (errors: Record<string, string>) => void;
}) => {
    const [previewState, setPreviewState] = useState<EmailPreviewState>({status: 'idle'});
    const previewRequestIdRef = useRef(0);

    const exitPreview = () => {
        previewRequestIdRef.current += 1;
        setPreviewState({status: 'idle'});
        setErrors({});
    };

    const enterPreview = async (draft: EmailDraft) => {
        const requestId = previewRequestIdRef.current + 1;
        previewRequestIdRef.current = requestId;

        const validationErrors = getEmailValidationErrors(draft);
        if (validationErrors.lexical) {
            setErrors({lexical: validationErrors.lexical});
            setPreviewState({
                status: 'invalid',
                message: validationErrors.lexical
            });
            return;
        }

        setErrors({});
        setPreviewState({status: 'loading'});

        try {
            // Only the latest preview request is allowed to update preview state.
            const response = await previewAutomationEmail({
                id: automationId,
                subject: draft.subject,
                lexical: draft.lexical
            });

            if (previewRequestIdRef.current !== requestId) {
                return;
            }

            const preview = response.automation_email_previews?.[0];

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
    };

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
