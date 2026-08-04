import React from 'react';
import TopLevelGroup from '@/settings/app/components/top-level-group';
import {Button} from '@tryghost/shade/components';
import {useSettingsNavigation} from '@/settings/app/hooks/use-settings-navigation';

const EmbedSignupForm: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {updateRoute} = useSettingsNavigation();
    const openPreviewModal = () => {
        updateRoute('embed-signup-form/show');
    };

    return (
        <TopLevelGroup
            customButtons={<Button className='mt-[-5px]' size='sm' type='button' variant='ghost' onClick={openPreviewModal}>Embed</Button>}
            description="Grow your audience from anywhere on the web"
            keywords={keywords}
            navid='embed-signup-form'
            testId='embed-signup-form'
            title='Signup forms'
        />
    );
};

export default EmbedSignupForm;
