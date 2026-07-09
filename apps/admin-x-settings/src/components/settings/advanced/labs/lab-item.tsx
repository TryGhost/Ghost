import React from 'react';
import {ListItem} from '@tryghost/admin-x-design-system';

const LabItem: React.FC<{
    title?: React.ReactNode;
    detail?: React.ReactNode;
    action?: React.ReactNode;
    testId?: string;
}> = ({
    title, detail, action, testId
}) => {
    return (
        <ListItem
            action={action}
            bgOnHover={false}
            detail={detail}
            paddingRight={false}
            testId={testId}
            title={title} />
    );
};

export default LabItem;
