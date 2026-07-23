import NiceModal from '@ebay/nice-modal-react';
import React, {type ReactNode} from 'react';
import {ConfirmationModalContent} from '../../../confirmation-modal';
import {ErrorTextCard, type FatalErrors, ThemeValidationDetailsDisclosure, ValidationProblemCard, getIssuesFromFatalErrors} from './theme-validation-details';
import {useBrowseConfig} from '@tryghost/admin-x-framework/api/config';

export type {FatalErrors} from './theme-validation-details';

const InvalidThemeModal: React.FC<{
    title: string
    prompt: ReactNode
    fatalErrors?: FatalErrors;
    validationDetailsDefaultOpen?: boolean;
    onRetry?: (modal?: {
        remove: () => void;
    }) => void | Promise<void>;
}> = ({title, prompt, fatalErrors, validationDetailsDefaultOpen, onRetry}) => {
    const {data: configData} = useBrowseConfig();
    const defaultOpen = validationDetailsDefaultOpen ?? configData?.config?.environment === 'development';
    const {blockingProblems, secondaryProblems, stringErrors} = getIssuesFromFatalErrors(fatalErrors);
    const blockingIssueCount = blockingProblems.length + stringErrors.length;
    const promptText = prompt ?? <>Ghost found {blockingIssueCount === 1 ? 'a blocking validation error' : `${blockingIssueCount} blocking validation errors`} and did not save your theme. Fix {blockingIssueCount === 1 ? 'the issue' : 'the issues'} below and try again.</>;

    return <ConfirmationModalContent
        cancelLabel='Close'
        okLabel={'Retry'}
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
    />;
};

export default NiceModal.create(InvalidThemeModal);
