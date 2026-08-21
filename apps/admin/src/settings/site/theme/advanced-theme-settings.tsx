import InvalidThemeModal, {type FatalErrors} from './invalid-theme-modal';
import React, {useState} from 'react';
import useCustomFonts from '@/settings/hooks/use-custom-fonts';
import {ActionList, ActionListItem, ActionListItemActions, ActionListItemContent, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from '@tryghost/shade/components';
import {JSONError} from '@tryghost/admin-x-framework/errors';
import {LucideIcon} from '@tryghost/shade/utils';
import {ModalPage} from '@tryghost/shade/page-templates';
import {type Theme, isActiveTheme, isDefaultTheme, isDeletableTheme, isLegacyTheme, useActivateTheme, useDeleteTheme} from '@tryghost/admin-x-framework/api/themes';
import {downloadFromEndpoint} from '@tryghost/admin-x-framework/helpers';
import {toast} from 'sonner';
import {useCheckThemeLimitError} from '@/settings/hooks/use-check-theme-limit-error';
import {useConfirmation} from '@/settings/providers/confirmation-context';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useSettingsNavigation} from '@/settings/hooks/use-settings-navigation';
import {useUpgradeRoute} from '@/settings/hooks/use-upgrade-route';

interface ThemeActionProps {
    theme: Theme;
}

interface ThemeSettingProps {
    themes: Theme[];
}

function getThemeLabel(theme: Theme): React.ReactNode {
    const name = theme.package?.name || theme.name;
    let label: React.ReactNode = name;

    if (isDefaultTheme(theme)) {
        label = `${name} (default)`;
    } else if (isLegacyTheme(theme)) {
        label = `${name} (legacy)`;
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
    const {route, updateRoute} = useSettingsNavigation();
    const upgradeRoute = useUpgradeRoute();
    const {checkThemeLimitError} = useCheckThemeLimitError();
    const {confirm, showLimit} = useConfirmation();
    const [activationErrors, setActivationErrors] = useState<FatalErrors | null>(null);

    const handleActivate = async () => {
        try {
            await activateTheme(theme.name);
            refreshActiveThemeData();
            toast.success('Theme activated', {description: <div><span className='capitalize'>{theme.name}</span> is now your active theme</div>});
        } catch (e) {
            let fatalErrors: FatalErrors | null = null;
            if (e instanceof JSONError && e.response?.status === 422 && e.data?.errors) {
                fatalErrors = e.data.errors as unknown as FatalErrors;
            } else {
                handleError(e);
            }
            if (fatalErrors) {
                setActivationErrors(fatalErrors);
            }
        }
    };

    const handleDownload = () => {
        downloadFromEndpoint(`/themes/${theme.name}/download`);
    };

    const handleDelete = () => {
        confirm({
            title: 'Are you sure you want to delete this?',
            prompt: (
                <>
                    You are about to delete <strong>&quot;{theme.name}&quot;.</strong> This is permanent! We warned you, k?
                    Maybe download
                    {' '}
                    <span
                        className='cursor-pointer text-green-500'
                        onClick={handleDownload}
                    >
                        your theme before continuing
                    </span>
                </>
            ),
            okLabel: 'Delete',
            okRunningLabel: 'Deleting',
            okVariant: 'destructive',
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
            showLimit({
                prompt: limitError,
                onOk: () => updateRoute({route: upgradeRoute, isExternal: true})
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
                size='sm'
                type='button'
                variant='ghost'
                onClick={() => void handleActivate()}
            >Activate</Button>
        );
    }

    return (
        <div className='-mr-3 flex items-center gap-4'>
            {actions}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button aria-label='Menu' size='icon' type='button' variant='ghost'><LucideIcon.Ellipsis /></Button>
                </DropdownMenuTrigger>
                {/* legacy Modal overlay is z-[1000]; keep the portalled menu above it */}
                <DropdownMenuContent align='end' className='z-[9999]'>
                    <DropdownMenuItem onSelect={() => void handleEditCode()}>Edit code</DropdownMenuItem>
                    <DropdownMenuItem onSelect={handleDownload}>Download</DropdownMenuItem>
                    {isDeletableTheme(theme) && (
                        <DropdownMenuItem onSelect={handleDelete}>Delete</DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
            {activationErrors && (
                <InvalidThemeModal
                    fatalErrors={activationErrors}
                    prompt={<>This theme couldn&apos;t be activated because Ghost found a blocking validation error. Fix the issue below and try again.</>}
                    title='Theme not activated'
                    onClose={() => setActivationErrors(null)}
                    onRetry={() => {
                        setActivationErrors(null);
                        void handleActivate();
                    }}
                />
            )}
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
        <>
            <h1 className='mb-5 text-2xl font-bold'>Installed themes</h1>
            <ActionList className='border-t border-border'>
                {themes.map((theme) => {
                const label = getThemeLabel(theme);
                const detail = getThemeVersion(theme);

                return (
                    <ActionListItem key={theme.name} data-testid='theme-list-item'>
                        <ActionListItemContent className='py-3 pr-6' id={`theme-${theme.name}`}>
                            <div>{label}</div>
                            {detail && <div className='text-sm text-muted-foreground'>{detail}</div>}
                        </ActionListItemContent>
                        <ActionListItemActions><ThemeActions theme={theme} /></ActionListItemActions>
                    </ActionListItem>
                );
                })}
            </ActionList>
        </>
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
