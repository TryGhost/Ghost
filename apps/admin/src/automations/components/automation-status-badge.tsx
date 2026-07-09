import React from 'react';
import type {Automation} from '@tryghost/admin-x-framework/api/automations';

const AutomationStatusBadge: React.FC<{status: Automation['status']}> = ({status}) => {
    switch (status) {
    case 'active':
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green/20 px-2 py-0.5 text-xs font-medium text-green uppercase">
                <span className="size-1.5 rounded-full bg-green" />
                Live
            </span>
        );
    case 'inactive':
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground uppercase">
                Off
            </span>
        );
    default: {
        const invalidStatus: never = status;
        throw new Error(`Unhandled status: ${String(invalidStatus)}`);
    }
    }
};

export default AutomationStatusBadge;
