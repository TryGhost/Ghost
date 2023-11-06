import Button from '@tryghost/admin-x-design/global/Button';
import React from 'react';
import SettingGroup from '@tryghost/admin-x-design/settings/SettingGroup';
import useRouting from '../../../hooks/useRouting';
import {withErrorBoundary} from '@tryghost/admin-x-design/global/ErrorBoundary';

const AnnouncementBar: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {updateRoute} = useRouting();
    const openModal = () => {
        updateRoute('announcement-bar/edit');
    };

    return (
        <SettingGroup
            customButtons={<Button color='green' label='Customize' link linkWithPadding onClick={openModal}/>}
            description="Highlight important updates or offers"
            keywords={keywords}
            navid='announcement-bar'
            testId='announcement-bar'
            title="Announcement bar"
        />
    );
};

export default withErrorBoundary(AnnouncementBar, 'Announcement bar');
