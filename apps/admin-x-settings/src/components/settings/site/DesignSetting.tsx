import React from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import {Button, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const DesignSetting: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {updateRoute} = useRouting();
    const openPreviewModal = () => {
        updateRoute('design/edit');
    };

    return (
        <TopLevelGroup
            customButtons={<Button className='mt-[-5px]' color='clear' label='Customize' size='sm' onClick={openPreviewModal}/>}
            description="Customize the theme, colors, and layout of your site"
            keywords={keywords}
            navid='design'
            testId='design'
            title="Design & branding"
        />
    );
};

export default withErrorBoundary(DesignSetting, 'Branding and design');
