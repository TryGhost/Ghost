import Button from '../../../../admin-x-ds/global/Button';
import React from 'react';
import SettingGroup from '../../../../admin-x-ds/settings/SettingGroup';
import useRouting from '../../../../hooks/useRouting';

const EmbedSignupForm: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {updateRoute} = useRouting();
    const openPreviewModal = () => {
        updateRoute('embed-signup-form/show');
    };

    return (
        <SettingGroup
            customButtons={<Button color='green' label='Embed' link onClick={openPreviewModal}/>}
            description="Grow your audience from anywhere on the web"
            keywords={keywords}
            navid='embed-signup-form'
            testId='embed-signup-form'
            title="Embeddable signup form"
        />
    );
};

export default EmbedSignupForm;
