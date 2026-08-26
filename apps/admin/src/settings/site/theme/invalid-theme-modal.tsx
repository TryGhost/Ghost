import React, {type ReactNode} from 'react';
import {ConfirmationModalContent} from '@/settings/components/confirmation-modal';
import {ErrorTextCard, ThemeValidationDetailsDisclosure, ValidationProblemCard} from './theme-validation-details';
import {type FatalErrors, getIssuesFromFatalErrors} from './theme-validation-issues';
import {useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {formatNumber} from '@tryghost/shade/utils';

export type {FatalErrors} from './theme-validation-issues';

export type InvalidThemeModalProps = {
    title: string
    prompt?: ReactNode
    fatalErrors?: FatalErrors;
    validationDetailsDefaultOpen?: boolean;
    onRetry?: (modal?: {
        remove: () => void;
    }) => void | Promise<void>;
};

const InvalidThemeModal: React.FC<InvalidThemeModalProps & {onClose: () => void}> = ({title, prompt, fatalErrors, validationDetailsDefaultOpen, onRetry, onClose}) => {
    const {data: configData} = useBrowseConfig();
    const defaultOpen = validationDetailsDefaultOpen ?? configData?.config?.environment === 'development';
    const {blockingProblems, secondaryProblems, stringErrors} = getIssuesFromFatalErrors(fatalErrors);
    const blockingIssueCount = blockingProblems.length + stringErrors.length;
    const promptText = prompt ?? <>Ghost found {blockingIssueCount === 1 ? 'a blocking validation error' : `${formatNumber(blockingIssueCount)} blocking validation errors`} and did not save your theme. Fix {blockingIssueCount === 1 ? 'the issue' : 'the issues'} below and try again.</>;

    return <ConfirmationModalContent
        cancelLabel='Close'
        okLabel={onRetry ? 'Retry' : ''}
        okVariant='default'
        prompt={<>
            <div className='space-y-5'>
                <div className='text-sm text-foreground'>{promptText}</div>

                {(blockingProblems.length > 0 || stringErrors.length > 0) && (
                    <div className='space-y-3'>
                        {blockingProblems.map(problem => (
                            <ValidationProblemCard key={problem.code} problem={problem} prominent />
                        ))}
                        {stringErrors.map(error => <ErrorTextCard key={error} message={error} />)}
                    </div>
                )}

                <ThemeValidationDetailsDisclosure
                    defaultOpen={defaultOpen}
                    problems={secondaryProblems}
                />
            </div>
        </>}
        stickyFooter={true}
        title={title}
        onOk={onRetry}
        onRemove={onClose}
    />;
};

export default InvalidThemeModal;
