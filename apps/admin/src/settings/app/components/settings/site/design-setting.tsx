import DesignSettingsImg from '@/settings/app/assets/images/design-settings.png';
import React from 'react';
import TopLevelGroup from '@/settings/app/components/top-level-group';
import {Button} from '@tryghost/shade/components';
import {useSettingsNavigation} from '@/settings/app/hooks/use-settings-navigation';
import {withErrorBoundary} from '@/settings/app/components/error-boundary';

const DesignSetting: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {updateRoute} = useSettingsNavigation();
    const openPreviewModal = () => {
        updateRoute('design/edit');
    };

    return (
        <TopLevelGroup
            customButtons={<Button className='mt-[-5px]' size='sm' type='button' variant='ghost' onClick={openPreviewModal}>Customize</Button>}
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
