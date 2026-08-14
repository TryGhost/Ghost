import InvalidThemeModal, {type FatalErrors} from './invalid-theme-modal';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import useCustomFonts from '../../../../hooks/use-custom-fonts';
import {Button, ConfirmationModal, LimitModal, List, ListItem, ModalPage, showToast} from '@tryghost/admin-x-design-system';
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from '@tryghost/shade/components';
import {JSONError} from '@tryghost/admin-x-framework/errors';
import {type Theme, isActiveTheme, isDefaultTheme, isDeletableTheme, isLegacyTheme, useActivateTheme, useDeleteTheme} from '@tryghost/admin-x-framework/api/themes';
import {downloadFile, getGhostPaths} from '@tryghost/admin-x-framework/helpers';
import {useCheckThemeLimitError} from '../../../../hooks/use-check-theme-limit-error';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useRouting} from '@tryghost/admin-x-framework/routing';

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
            <span className='md:text-base'>
                {label} <span className='text-grey-600'>({theme.name})</span>
            </span>;
    }

    if (isActiveTheme(theme)) {
        label =
            <span className="font-bold md:text-base">
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
    const {refreshActiveThemeData} = useCustomFonts();
    const handleError = useHandleError();
    const {route, updateRoute} = useRouting();
    const {checkThemeLimitError} = useCheckThemeLimitError();

    const handleActivate = async () => {
        try {
            await activateTheme(theme.name);
            refreshActiveThemeData();
            showToast({
                title: 'Theme activated',
                type: 'success',
                message: <div><span className='capitalize'>{theme.name}</span> is now your active theme</div>
            });
        } catch (e) {
            let fatalErrors: FatalErrors | null = null;
            if (e instanceof JSONError && e.response?.status === 422 && e.data?.errors) {
                fatalErrors = e.data.errors as unknown as FatalErrors;
            } else {
                handleError(e);
            }
            const title = 'Theme not activated';
            const prompt = <>This theme couldn&apos;t be activated because Ghost found a blocking validation error. Fix the issue below and try again.</>;

            if (fatalErrors) {
                NiceModal.show(InvalidThemeModal, {
                    title,
                    prompt,
                    fatalErrors,
                    onRetry: async (modal) => {
                        modal?.remove();
                        handleActivate();
                    }
                });
            }
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

    const handleEditCode = async () => {
        const limitError = await checkThemeLimitError('.');

        if (limitError) {
            NiceModal.show(LimitModal, {
                prompt: limitError,
                onOk: () => updateRoute({route: '/pro', isExternal: true})
            });
            return;
        }

        updateRoute(`theme/edit/${encodeURIComponent(theme.name)}?from=${encodeURIComponent(route ?? '')}`);
    };

    const actions = [];

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

    return (
        <div className='-mr-3 flex items-center gap-4'>
            {actions}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button icon='ellipsis' iconColorClass='text-base' label='Menu' size='sm' hideLabel />
                </DropdownMenuTrigger>
                {/* legacy ModalPage overlay is z-[1000]; keep the portalled menu above it */}
                <DropdownMenuContent align='end' className='z-[9999]'>
                    <DropdownMenuItem onSelect={handleEditCode}>Edit code</DropdownMenuItem>
                    <DropdownMenuItem onSelect={handleDownload}>Download</DropdownMenuItem>
                    {isDeletableTheme(theme) && (
                        <DropdownMenuItem onSelect={handleDelete}>Delete</DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
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
            if (a.package?.name && b.package?.name) {
                return a.package.name.localeCompare(b.package.name);
            } else {
                return a.name.localeCompare(b.name);
            }
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
