import NiceModal from '@ebay/nice-modal-react';
import React, {useEffect, useState} from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import {Button, LimitModal, SettingGroupContent, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {Theme, useBrowseThemes} from '@tryghost/admin-x-framework/api/themes';
import {useCheckThemeLimitError} from '../../../hooks/useCheckThemeLimitError';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const ChangeTheme: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const [themeLimitError, setThemeLimitError] = useState<string|null>(null);
    const [isCheckingLimit, setIsCheckingLimit] = useState(false);
    const {checkThemeLimitError} = useCheckThemeLimitError();
    const {updateRoute} = useRouting();
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
