import Button, {ButtonProps} from '../../../../admin-x-ds/global/Button';
import ConfirmationModal from '../../../../admin-x-ds/global/modal/ConfirmationModal';
import List from '../../../../admin-x-ds/global/List';
import ListItem from '../../../../admin-x-ds/global/ListItem';
import Menu from '../../../../admin-x-ds/global/Menu';
import ModalPage from '../../../../admin-x-ds/global/modal/ModalPage';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import {Theme} from '../../../../types/api';
import {downloadFile, getGhostPaths} from '../../../../utils/helpers';
import {isActiveTheme, isDefaultTheme, isDeletableTheme} from '../../../../models/themes';
import {useApi} from '../../../providers/ServiceProvider';

interface ThemeActionProps {
    theme: Theme;
    themes: Theme[];
    updateThemes: (themes: Theme[]) => void;
}

interface ThemeSettingProps {
    themes: Theme[];
    setThemes: (themes: Theme[]) => void;
}

function getThemeLabel(theme: Theme): React.ReactNode {
    let label: React.ReactNode = theme.package?.name || theme.name;

    if (isDefaultTheme(theme)) {
        label += ' (default)';
    } else if (theme.package?.name !== theme.name) {
        label =
            <>
                {label} <span className='text-grey-600'>({theme.name})</span>
            </>;
    }

    if (isActiveTheme(theme)) {
        label =
            <span className="font-bold">
                {label} &mdash; <span className='text-green'> Active</span>
            </span>;
    }

    return label;
}

function getThemeVersion(theme: Theme): string {
    return theme.package?.version || '1.0';
}

const ThemeActions: React.FC<ThemeActionProps> = ({
    theme,
    themes,
    updateThemes
}) => {
    const api = useApi();

    const handleActivate = async () => {
        const data = await api.themes.activate(theme.name);
        const updatedTheme = data.themes[0];

        const updatedThemes: Theme[] = themes.map((t) => {
            if (t.name === updatedTheme.name) {
                return updatedTheme;
            }
            return {
                ...t,
                active: false
            };
        });
        updateThemes(updatedThemes);
    };

    const handleDownload = async () => {
        const {apiRoot} = getGhostPaths();
        downloadFile(`${apiRoot}/themes/${theme.name}/download`);
    };

    const handleDelete = async () => {
        NiceModal.show(ConfirmationModal, {
            title: 'Are you sure you want to delete this?',
            prompt: (
                <>
                    You are about to delete <strong>&quot;{theme.name}&quot;.</strong> This is permanent! We warned you, k?
                    Maybe download
                    {' '}
                    <span
                        className='cursor-pointer text-green-500'
                        onClick={() => {
                            handleDownload();
                        }}
                    >
                        your theme before continuing
                    </span>
                </>
            ),
            okLabel: 'Delete',
            okRunningLabel: 'Deleting',
            okColor: 'red',
            onOk: async (modal) => {
                await api.themes.delete(theme.name);
                const updatedThemes = themes.filter(t => t.name !== theme.name);
                updateThemes(updatedThemes);
                modal?.remove();
            }
        });
    };

    let actions = [];

    if (!isActiveTheme(theme)) {
        actions.push(
            <Button
                key='activate'
                className='ml-2'
                color='green'
                label={'Activate'}
                link={true}
                onClick={handleActivate}
            />
        );
    }

    let menuItems = [
        {
            id: 'download',
            label: 'Download',
            onClick: handleDownload
        }
    ];

    if (isDeletableTheme(theme)) {
        menuItems.push({
            id: 'delete',
            label: 'Delete',
            onClick: handleDelete
        });
    }

    const buttonProps: ButtonProps = {
        size: 'sm'
    };

    return (
        <div className='-mr-3 flex items-center gap-4'>
            {actions}
            <Menu items={menuItems} position='left' triggerButtonProps={buttonProps} />
        </div>
    );
};

const ThemeList:React.FC<ThemeSettingProps> = ({
    themes,
    setThemes
}) => {
    themes.sort((a, b) => {
        if (a.active && !b.active) {
            return -1; // a comes before b
        } else if (!a.active && b.active) {
            return 1; // b comes before a
        } else {
            // Both have the same active status, sort alphabetically
            return a.name.localeCompare(b.name);
        }
    });

    return (
        <List pageTitle='Installed themes'>
            {themes.map((theme) => {
                const label = getThemeLabel(theme);
                const detail = getThemeVersion(theme);

                return (
                    <ListItem
                        key={theme.name}
                        action={
                            <ThemeActions
                                theme={theme}
                                themes={themes}
                                updateThemes={setThemes}
                            />
                        }
                        detail={detail}
                        id={`theme-${theme.name}`}
                        separator={false}
                        testId='theme-list-item'
                        title={label}
                    />
                );
            })}
        </List>
    );
};

const AdvancedThemeSettings: React.FC<ThemeSettingProps> = ({
    themes,
    setThemes
}) => {
    return (
        <ModalPage>
            <ThemeList
                setThemes={setThemes}
                themes={themes}
            />
        </ModalPage>
    );
};

export default AdvancedThemeSettings;
