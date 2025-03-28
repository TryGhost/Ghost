import React from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import {Button, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const AnnouncementBar: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {updateRoute} = useRouting();
    const openModal = () => {
        updateRoute('announcement-bar/edit');
    };

    return (
        <TopLevelGroup
            customButtons={<Button className='mt-[-5px]' color='clear' label='Customize' size='sm' onClick={openModal}/>}
            description="Highlight important updates or offers"
            keywords={keywords}
            navid='announcement-bar'
            testId='announcement-bar'
            title="Announcement bar"
        />
    );
};

export default withErrorBoundary(AnnouncementBar, 'Announcement bar');
