import Button, {ButtonProps} from '../../../../admin-x-ds/global/Button';
import ConfirmationModal from '../../../../admin-x-ds/global/modal/ConfirmationModal';
import List from '../../../../admin-x-ds/global/List';
import ListItem from '../../../../admin-x-ds/global/ListItem';
import Menu from '../../../../admin-x-ds/global/Menu';
import ModalPage from '../../../../admin-x-ds/global/modal/ModalPage';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import useHandleError from '../../../../utils/api/handleError';
import {Theme, isActiveTheme, isDefaultTheme, isDeletableTheme, isLegacyTheme, useActivateTheme, useDeleteTheme} from '../../../../api/themes';
import {downloadFile, getGhostPaths} from '../../../../utils/helpers';

interface ThemeActionProps {
    theme: Theme;
}

interface ThemeSettingProps {
    themes: Theme[];
}

function getThemeLabel(theme: Theme): React.ReactNode {
    let label: React.ReactNode = theme.package?.name || theme.name;

    if (isDefaultTheme(theme)) {
        label += ' (default)';
    } else if (isLegacyTheme(theme)) {
        label += ' (legacy)';
    } else if (theme.package?.name !== theme.name) {
        label =
            <span className='text-sm md:text-base'>
                {label} <span className='text-grey-600'>({theme.name})</span>
            </span>;
    }

    if (isActiveTheme(theme)) {
        label =
            <span className="text-sm font-bold md:text-base">
                {label} &mdash; <span className='text-green'> Active</span>
            </span>;
    }

    return label;
}

function getThemeVersion(theme: Theme): string {
    return theme.package?.version || '1.0';
}

const ThemeActions: React.FC<ThemeActionProps> = ({
    theme
}) => {
    const {mutateAsync: activateTheme} = useActivateTheme();
    const {mutateAsync: deleteTheme} = useDeleteTheme();
    const handleError = useHandleError();

    const handleActivate = async () => {
        try {
            await activateTheme(theme.name);
        } catch (e) {
            handleError(e);
        }
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
                try {
                    await deleteTheme(theme.name);
                    modal?.remove();
                } catch (e) {
                    handleError(e);
                }
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
    themes
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
                        action={<ThemeActions theme={theme} />}
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

const AdvancedThemeSettings: React.FC<ThemeSettingProps> = ({themes}) => {
    return (
        <ModalPage>
            <ThemeList themes={themes} />
        </ModalPage>
    );
};

export default AdvancedThemeSettings;
