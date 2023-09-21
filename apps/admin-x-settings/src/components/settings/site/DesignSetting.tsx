import Button from '../../../admin-x-ds/global/Button';
import React from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import useRouting from '../../../hooks/useRouting';
import {withErrorBoundary} from '../../../admin-x-ds/global/ErrorBoundary';

const DesignSetting: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {updateRoute} = useRouting();
    const openPreviewModal = () => {
        updateRoute('design/edit');
    };

    return (
        <SettingGroup
            customButtons={<Button color='green' label='Customize' link linkWithPadding onClick={openPreviewModal}/>}
            description="Customize the look and feel of your site"
            keywords={keywords}
            navid='design'
            testId='design'
            title="Branding and design"
        />
    );
};

export default withErrorBoundary(DesignSetting, 'Branding and design');
