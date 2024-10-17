import DesignSettingsImg from '../../../assets/images/design-settings.png';
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
            description="Customize the style and layout of your site"
            keywords={keywords}
            navid='design'
            testId='design'
            title="Design & branding">
            <img src={DesignSettingsImg} />
        </TopLevelGroup>
    );
};

export default withErrorBoundary(DesignSetting, 'Branding and design');
