import NiceModal from '@ebay/nice-modal-react';
import React, {ReactNode, useState} from 'react';
import useCustomFonts from '../../../../hooks/useCustomFonts';
import {Button, ConfirmationModalContent, Heading, List, ListItem, showToast} from '@tryghost/admin-x-design-system';
import {InstalledTheme, ThemeProblem, useActivateTheme} from '@tryghost/admin-x-framework/api/themes';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';

export const ThemeProblemView = ({problem}:{problem: ThemeProblem}) => {
    const [isExpanded, setExpanded] = useState(false);

    return <ListItem
        title={
            <>
                <div className={`${problem.level === 'error' ? 'before:bg-red' : 'before:bg-yellow'} relative px-4 text-sm before:absolute before:left-0 before:top-1.5 before:block before:h-2 before:w-2 before:rounded-full before:content-['']`}>
                    <strong>{problem.level === 'error' ? 'Error: ' : 'Warning: '}</strong>
                    <span dangerouslySetInnerHTML={{__html: problem.rule}} />
                    <div className='absolute -right-4 top-1'>
                        <Button color="green" icon={isExpanded ? 'chevron-down' : 'chevron-right'} iconColorClass='text-grey-700' size='sm' link onClick={() => setExpanded(!isExpanded)} />
                    </div>
                </div>
                {
                    isExpanded ?
                        <div className='mt-2 px-4 text-[13px] leading-8'>
                            <div dangerouslySetInnerHTML={{__html: problem.details}} className='mb-4' />
                            <Heading level={6}>Affected files:</Heading>
                            <ul className='mt-1'>
                                {problem.failures.map(failure => <li><code>{failure.ref}</code>{failure.message ? `: ${failure.message}` : ''}</li>)}
                            </ul>
                        </div> :
                        null
                }
            </>
        }
        hideActions
        separator
    />;
};

const ThemeInstalledModal: React.FC<{
    title: string
    prompt: ReactNode
    installedTheme: InstalledTheme;
    onActivate?: () => void;
}> = ({title, prompt, installedTheme, onActivate}) => {
    const {mutateAsync: activateTheme} = useActivateTheme();
    const {refreshActiveThemeData} = useCustomFonts();
    const handleError = useHandleError();

    let errorPrompt = null;
    if (installedTheme && installedTheme.gscan_errors) {
        errorPrompt = <div className="mt-6">
            <List hint={<>Highly recommended to fix, functionality <strong>could</strong> be restricted</>} title="Errors">
                {installedTheme.gscan_errors?.map(error => <ThemeProblemView problem={error} />)}
            </List>
        </div>;
    }

    let warningPrompt = null;
    if (installedTheme && installedTheme.warnings) {
        warningPrompt = <div className="mt-10">
            <List title="Warnings">
                {installedTheme.warnings?.map(warning => <ThemeProblemView problem={warning} />)}
            </List>
        </div>;
    }

    let okLabel = `Activate${installedTheme.gscan_errors?.length ? ' with errors' : ''}`;

    if (installedTheme.active) {
        okLabel = 'OK';
    }

    return <ConfirmationModalContent
        cancelLabel='Close'
        okColor='black'
        okLabel={okLabel}
        okRunningLabel='Activating...'
        prompt={<>
            {prompt}

            {errorPrompt}
            {warningPrompt}
        </>}
        title={title}
        onOk={async (activateModal) => {
            if (!installedTheme.active) {
                try {
                    const resData = await activateTheme(installedTheme.name);
                    const updatedTheme = resData.themes[0];
                    refreshActiveThemeData();

                    showToast({
                        title: 'Theme activated',
                        type: 'success',
                        message: <div><span className='capitalize'>{updatedTheme.name}</span> is now your active theme.</div>
                    });
                } catch (e) {
                    handleError(e);
                }
            }
            onActivate?.();
            activateModal?.remove();
        }}
    />;
};

export default NiceModal.create(ThemeInstalledModal);
