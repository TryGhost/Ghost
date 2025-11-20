import React from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import {Button, withErrorBoundary} from '@tryghost/admin-x-design-system';

const MemberEmails: React.FC<{ keywords: string[] }> = ({keywords}) => {
    return (
        <TopLevelGroup
            customButtons={<Button className='mt-[-5px]' color='outline' icon='ellipsis' size='sm' />}
            description="Sent to new members right after they subscribed to your site."
            keywords={keywords}
            navid='memberemails'
            testId='memberemails'
            title="Welcome emails"
        />
    );
};

export default withErrorBoundary(MemberEmails, 'MemberEmails');
