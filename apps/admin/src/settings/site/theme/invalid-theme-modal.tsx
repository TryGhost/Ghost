import React from 'react';
import {ConfirmationModalContent} from '@/settings/components/confirmation-modal';
import {ThemeValidationIssueList, ValidationProblemList} from './theme-validation-details';
import {type FatalErrors, getIssuesFromFatalErrors} from './theme-validation-issues';

export type {FatalErrors} from './theme-validation-issues';

/** Past tense of the action that Ghost refused to complete. */
export type InvalidThemeAction = 'uploaded' | 'activated' | 'saved';

export type InvalidThemeModalProps = {
    title: string;
    /** Theme the failed action applied to, named in the status sentence. */
    themeName?: string;
    action?: InvalidThemeAction;
    cancelLabel?: string;
    /** Defaults to `Try again` when the caller can retry, and to no button when it can't. */
    okLabel?: string;
    fatalErrors?: FatalErrors;
    onRetry?: (modal?: {
        remove: () => void;
    }) => void | Promise<void>;
};

const InvalidThemeModal: React.FC<InvalidThemeModalProps & {onClose: () => void}> = ({
    title,
    themeName,
    action = 'uploaded',
    cancelLabel = 'Cancel',
    okLabel,
    fatalErrors,
    onRetry,
    onClose
}) => {
    const {blockingProblems, secondaryProblems, stringErrors} = getIssuesFromFatalErrors(fatalErrors);

    return <ConfirmationModalContent
        cancelLabel={cancelLabel}
        okLabel={okLabel ?? (onRetry ? 'Try again' : '')}
        okVariant='default'
        prompt={
            <div className='space-y-5'>
                <p className='text-base text-foreground'>
                    {themeName ? <strong>{themeName}</strong> : 'This theme'} couldn&apos;t be {action}. Fix the errors below and try again.
                </p>

                <ValidationProblemList messages={stringErrors} problems={blockingProblems} expandedByDefault />

                <ThemeValidationIssueList problems={secondaryProblems} />
            </div>
        }
        stickyFooter={true}
        title={title}
        onOk={onRetry}
        onRemove={onClose}
    />;
};

export default InvalidThemeModal;
