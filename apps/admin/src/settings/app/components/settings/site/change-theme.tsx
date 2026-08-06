import React, {useEffect, useState} from 'react';
import TopLevelGroup from '@/settings/app/components/top-level-group';
import {Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import {SettingGroupContent} from '@tryghost/shade/patterns';
import {Text} from '@tryghost/shade/primitives';
import {type Theme, useBrowseThemes} from '@tryghost/admin-x-framework/api/themes';
import {downloadFile, getGhostPaths} from '@tryghost/admin-x-framework/helpers';
import {useCheckThemeLimitError} from '@/settings/app/hooks/use-check-theme-limit-error';
import {useConfirmation} from '@/settings/app/components/providers/confirmation-provider';
import {useSettingsNavigation} from '@/settings/app/hooks/use-settings-navigation';
import {withErrorBoundary} from '@/settings/app/components/error-boundary';

const ChangeTheme: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const [themeLimitError, setThemeLimitError] = useState<string|null>(null);
    const [isCheckingLimit, setIsCheckingLimit] = useState(false);
    const {checkThemeLimitError} = useCheckThemeLimitError();
    const {route, updateRoute} = useSettingsNavigation();
    const {showLimit} = useConfirmation();
    const {data: themesData} = useBrowseThemes();
    const activeTheme = themesData?.themes.find((theme: Theme) => theme.active);

    useEffect(() => {
        const checkIfThemeChangeAllowed = async () => {
            setIsCheckingLimit(true);
            const error = await checkThemeLimitError();
            setThemeLimitError(error);
            setIsCheckingLimit(false);
        };

        checkIfThemeChangeAllowed();
    }, [checkThemeLimitError]);

    const openPreviewModal = async () => {
        // Wait for limit check if still in progress
        if (isCheckingLimit) {
            return;
        }

        if (themeLimitError) {
            showLimit({
                prompt: themeLimitError,
                onOk: () => updateRoute({route: '/pro', isExternal: true})
            });
        } else {
            updateRoute('design/change-theme');
        }
    };

    const openThemeEditor = async () => {
        if (!activeTheme) {
            return;
        }

        const limitError = await checkThemeLimitError('.');

        if (limitError) {
            showLimit({
                prompt: limitError,
                onOk: () => updateRoute({route: '/pro', isExternal: true})
            });
            return;
        }

        updateRoute(`theme/edit/${encodeURIComponent(activeTheme.name)}?from=${encodeURIComponent(route ?? '')}`);
    };

    const downloadTheme = () => {
        if (!activeTheme) {
            return;
        }

        const {apiRoot} = getGhostPaths();
        downloadFile(`${apiRoot}/themes/${activeTheme.name}/download`);
    };

    const values = (
        <SettingGroupContent>
            <div className='flex flex-col'>
                <Text as='h6' className='text-base' weight='semibold'>Active theme</Text>
                <div className='mt-1 flex w-full items-center justify-between gap-4'>
                    <div>{activeTheme ? `${activeTheme.name} (v${activeTheme.package?.version || '1.0'})` : 'Loading...'}</div>
                    <div className='-mr-3'>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button aria-label='Menu' disabled={!activeTheme} size='icon' type='button' variant='ghost'><LucideIcon.Ellipsis /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align='end'>
                                <DropdownMenuItem onSelect={openThemeEditor}>Edit code</DropdownMenuItem>
                                <DropdownMenuItem onSelect={downloadTheme}>Download</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
        </SettingGroupContent>
    );

    return (
        <TopLevelGroup
            customButtons={
                <Button className='mt-[-5px]' size='sm' type='button' variant='ghost' onClick={openPreviewModal}>Change theme</Button>
            }
            description="Browse and install official themes or upload one"
            keywords={keywords}
            navid='theme'
            testId='theme'
            title="Theme"
        >
            {values}
        </TopLevelGroup>
    );
};

export default withErrorBoundary(ChangeTheme, 'Branding and design');
