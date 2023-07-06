import Button from '../../../../admin-x-ds/global/Button';
import Heading from '../../../../admin-x-ds/global/Heading';
import List from '../../../../admin-x-ds/global/List';
import ListItem from '../../../../admin-x-ds/global/ListItem';
import NiceModal from '@ebay/nice-modal-react';
import React, {ReactNode, useState} from 'react';
import {ConfirmationModalContent} from '../../../../admin-x-ds/global/modal/ConfirmationModal';
import {InstalledTheme, Theme, ThemeProblem} from '../../../../types/api';
import {showToast} from '../../../../admin-x-ds/global/Toast';
import {useApi} from '../../../providers/ServiceProvider';

const ThemeProblemView = ({problem}:{problem: ThemeProblem}) => {
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
    setThemes: (callback: (themes: Theme[]) => Theme[]) => void;
    onActivate?: () => void;
}> = ({title, prompt, installedTheme, setThemes, onActivate}) => {
    const api = useApi();

    let errorPrompt = null;
    if (installedTheme.errors) {
        errorPrompt = <div className="mt-6">
            <List hint={<>Highly recommended to fix, functionality <strong>could</strong> be restricted</>} title="Errors">
                {installedTheme.errors?.map(error => <ThemeProblemView problem={error} />)}
            </List>
        </div>;
    }

    let warningPrompt = null;
    if (installedTheme.warnings) {
        warningPrompt = <div className="mt-10">
            <List title="Warnings">
                {installedTheme.warnings?.map(warning => <ThemeProblemView problem={warning} />)}
            </List>
        </div>;
    }

    let okLabel = `Activate${installedTheme.errors?.length ? ' with errors' : ''}`;

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
                const resData = await api.themes.activate(installedTheme.name);
                const updatedTheme = resData.themes[0];

                setThemes((_themes) => {
                    const updatedThemes: Theme[] = _themes.map((t) => {
                        if (t.name === updatedTheme.name) {
                            return updatedTheme;
                        }
                        return {
                            ...t,
                            active: false
                        };
                    });
                    return updatedThemes;
                });

                showToast({
                    type: 'success',
                    message: <div><span className='capitalize'>{updatedTheme.name}</span> is now your active theme.</div>
                });
            }
            onActivate?.();
            activateModal?.remove();
        }}
    />;
};

export default NiceModal.create(ThemeInstalledModal);
