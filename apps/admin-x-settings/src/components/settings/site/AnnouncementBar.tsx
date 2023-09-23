import Button from '../../../admin-x-ds/global/Button';
import React from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import useRouting from '../../../hooks/useRouting';
import {withErrorBoundary} from '../../../admin-x-ds/global/ErrorBoundary';

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
