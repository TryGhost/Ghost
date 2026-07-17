import NiceModal from '@ebay/nice-modal-react';
import React, {useEffect, useState} from 'react';
import TopLevelGroup from '../../top-level-group';
import {Button, Heading, LimitModal, SettingGroupContent} from '@tryghost/admin-x-design-system';
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from '@tryghost/shade/components';
import {type Theme, useBrowseThemes} from '@tryghost/admin-x-framework/api/themes';
import {downloadFile, getGhostPaths} from '@tryghost/admin-x-framework/helpers';
import {useCheckThemeLimitError} from '../../../hooks/use-check-theme-limit-error';
import {useRouting} from '@tryghost/admin-x-framework/routing';
import {withErrorBoundary} from '../../error-boundary';

const ChangeTheme: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const [themeLimitError, setThemeLimitError] = useState<string|null>(null);
    const [isCheckingLimit, setIsCheckingLimit] = useState(false);
    const {checkThemeLimitError} = useCheckThemeLimitError();
    const {route, updateRoute} = useRouting();
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
            NiceModal.show(LimitModal, {
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
            NiceModal.show(LimitModal, {
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
                <Heading grey={false} level={6}>Active theme</Heading>
                <div className='mt-1 flex w-full items-center justify-between gap-4'>
                    <div>{activeTheme ? `${activeTheme.name} (v${activeTheme.package?.version || '1.0'})` : 'Loading...'}</div>
                    <div className='-mr-3'>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button disabled={!activeTheme} icon='ellipsis' iconColorClass='text-base' label='Menu' size='sm' hideLabel />
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
                <Button className='mt-[-5px]' color='clear' label='Change theme' size='sm' onClick={openPreviewModal} />
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
