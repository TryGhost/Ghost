import React from 'react';
import {ListItem} from '@tryghost/admin-x-design-system';

const LabItem: React.FC<{
    title?: React.ReactNode;
    detail?: React.ReactNode;
    action?: React.ReactNode;
}> = ({
    title, detail, action
}) => {
    return (
        <ListItem
            action={action}
            bgOnHover={false}
            detail={detail}
            paddingRight={false}
            title={title} />
    );
};

export default LabItem;
