import React from 'react';
import TopLevelGroup from '../../top-level-group';
import {Button} from '@tryghost/shade/components';
import {useRouting} from '@tryghost/admin-x-framework/routing';
import {withErrorBoundary} from '../../error-boundary';

const AnnouncementBar: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {updateRoute} = useRouting();
    const openModal = () => {
        updateRoute('announcement-bar/edit');
    };

    return (
        <TopLevelGroup
            customButtons={<Button className='mt-[-5px]' size='sm' type='button' variant='ghost' onClick={openModal}>Customize</Button>}
            description="Highlight important updates or offers"
            keywords={keywords}
            navid='announcement-bar'
            testId='announcement-bar'
            title="Announcement bar"
        />
    );
};

export default withErrorBoundary(AnnouncementBar, 'Announcement bar');
