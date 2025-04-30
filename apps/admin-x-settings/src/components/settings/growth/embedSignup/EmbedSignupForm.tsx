import React from 'react';
import TopLevelGroup from '../../../TopLevelGroup';
import {Button} from '@tryghost/admin-x-design-system';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const EmbedSignupForm: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {updateRoute} = useRouting();
    const openPreviewModal = () => {
        updateRoute('embed-signup-form/show');
    };

    return (
        <TopLevelGroup
            customButtons={<Button className='mt-[-5px]' color='clear' label='Embed' size='sm' onClick={openPreviewModal}/>}
            description="Grow your audience from anywhere on the web"
            keywords={keywords}
            navid='embed-signup-form'
            testId='embed-signup-form'
            title="Embeddable signup form"
        />
    );
};

export default EmbedSignupForm;
