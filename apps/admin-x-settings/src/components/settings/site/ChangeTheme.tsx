import React from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import {Button, SettingGroupContent, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {Theme, useBrowseThemes} from '@tryghost/admin-x-framework/api/themes';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const ChangeTheme: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {updateRoute} = useRouting();
    const {data: themesData} = useBrowseThemes();
    const activeTheme = themesData?.themes.find((theme: Theme) => theme.active);

    const openPreviewModal = () => {
        updateRoute('design/change-theme');
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
