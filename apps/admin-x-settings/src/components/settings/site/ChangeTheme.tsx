import NiceModal from '@ebay/nice-modal-react';
import React, {useEffect, useState} from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import {Button, LimitModal, SettingGroupContent, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {HostLimitError, useLimiter} from '../../../hooks/useLimiter';
import {Theme, useBrowseThemes} from '@tryghost/admin-x-framework/api/themes';
import {useGlobalData} from '../../providers/GlobalDataProvider';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const ChangeTheme: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const [themeLimitError, setThemeLimitError] = useState<string|null>(null);
    const [isCheckingLimit, setIsCheckingLimit] = useState(false);
    const limiter = useLimiter();
    const {config} = useGlobalData();
    const {updateRoute} = useRouting();
    const {data: themesData} = useBrowseThemes();
    const activeTheme = themesData?.themes.find((theme: Theme) => theme.active);

    useEffect(() => {
        const checkIfThemeChangeAllowed = async () => {
            setIsCheckingLimit(true);
            // If the allowlist only contains one single entry, we can assume that the user
            // is not allowed to change themes at all.
            const numberOfAllowedThemes = config.hostSettings?.limits?.customThemes?.allowlist?.length;
            if (numberOfAllowedThemes === 1) {
                await limiter?.errorIfWouldGoOverLimit('customThemes', {value: '.'}).catch((error) => {
                    if (error instanceof HostLimitError) {
                        setThemeLimitError(error?.message ?? 'Your current plan doesn\'t support changing themes.');
                    }
                });
            } else {
                // Ensure no error, if more than one theme is allowed
                setThemeLimitError(null);
            }
            setIsCheckingLimit(false);
        };

        if (limiter?.isLimited('customThemes')) {
            checkIfThemeChangeAllowed();
        } else {
            setThemeLimitError(null);
            setIsCheckingLimit(false);
        }
    }, [limiter, config.hostSettings?.limits?.customThemes?.allowlist?.length]);

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

    const values = (
        <SettingGroupContent
            values={[
                {
                    heading: 'Active theme',
                    key: 'active-theme',
                    value: activeTheme ? `${activeTheme.name} (v${activeTheme.package?.version || '1.0'})` : 'Loading...'
                }
            ]}
        />
    );

    return (
        <TopLevelGroup
            customButtons={<Button className='mt-[-5px]' color='clear' label='Change theme' size='sm' onClick={openPreviewModal}/>}
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
