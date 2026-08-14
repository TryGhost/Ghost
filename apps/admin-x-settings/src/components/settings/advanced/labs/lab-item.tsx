import React from 'react';
import {ActionListItem, ActionListItemActions, ActionListItemContent} from '@tryghost/shade/components';

const LabItem: React.FC<{
    title?: React.ReactNode;
    detail?: React.ReactNode;
    action?: React.ReactNode;
    testId?: string;
}> = ({
    title, detail, action, testId
}) => {
    return (
        <ActionListItem data-testid={testId} hover={false}>
            <ActionListItemContent className='py-3 pr-6'>
                <div>{title}</div>
                {detail && <div className='text-sm text-muted-foreground'>{detail}</div>}
            </ActionListItemContent>
            {action && <ActionListItemActions>{action}</ActionListItemActions>}
        </ActionListItem>
    );
};

export default LabItem;
