import Button from '../../../admin-x-ds/global/Button';
import Heading from '../../../admin-x-ds/global/Heading';
import List from '../../../admin-x-ds/global/List';
import ListItem from '../../../admin-x-ds/global/ListItem';
import NiceModal from '@ebay/nice-modal-react';
import React, {ReactNode, useState} from 'react';
import {ConfirmationModalContent} from '../../../admin-x-ds/global/modal/ConfirmationModal';
import {InstalledTheme, Theme, ThemeProblem} from '../../../types/api';
import {useApi} from '../../providers/ServiceProvider';

const ThemeProblemView = ({problem}:{problem: ThemeProblem}) => {
    const [isExpanded, setExpanded] = useState(false);

    return <ListItem
        action={<Button color="green" label={isExpanded ? 'Collapse' : 'Expand'} link onClick={() => setExpanded(!isExpanded)} />}
        detail={
            isExpanded ?
                <>
                    <div dangerouslySetInnerHTML={{__html: problem.details}} />
                    <Heading level={6}>Affected files:</Heading>
                    <ul>
                        {problem.failures.map(failure => <li><code>{failure.ref}</code>{failure.message ? `: ${failure.message}` : ''}</li>)}
                    </ul>
                </> :
                null
        }
        title={<>
            <strong>{problem.level === 'error' ? 'Error: ' : 'Warning: '}</strong>
            <span dangerouslySetInnerHTML={{__html: problem.rule}} />
        </>}
        hideActions
        separator
    />;
};

const ThemeInstalledModal: React.FC<{
    title: string
    prompt: ReactNode
    installedTheme: InstalledTheme;
    setThemes: (callback: (themes: Theme[]) => Theme[]) => void;
}> = ({title, prompt, installedTheme, setThemes}) => {
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
        warningPrompt = <div className="mt-6">
            <List title="Warnings">
                {installedTheme.warnings?.map(warning => <ThemeProblemView problem={warning} />)}
            </List>
        </div>;
    }

    return <ConfirmationModalContent
        cancelLabel='Close'
        okColor='black'
        okLabel={`Activate${installedTheme.errors?.length ? ' with errors' : ''}`}
        okRunningLabel='Activating...'
        prompt={<>
            {prompt}
            {errorPrompt}
            {warningPrompt}
        </>}
        title={title}
        onOk={async (activateModal) => {
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
            activateModal?.remove();
        }}
    />;
};

export default NiceModal.create(ThemeInstalledModal);
