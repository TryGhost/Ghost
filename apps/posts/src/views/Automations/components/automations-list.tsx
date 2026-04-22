import React from 'react';
import {Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@tryghost/shade/components';
import {formatNumber} from '@tryghost/shade/utils';

type AutomationStatus = 'active' | 'inactive';

interface AutomationRow {
    id: string;
    name: string;
    steps: number;
    status: AutomationStatus;
    lastRun: string;
}

const automations: AutomationRow[] = [
    {
        id: 'free-members-welcome-email',
        name: 'Free members welcome email',
        steps: 2,
        status: 'active',
        lastRun: '2 hours ago'
    },
    {
        id: 'paid-members-welcome-email',
        name: 'Paid members welcome email',
        steps: 3,
        status: 'active',
        lastRun: 'Yesterday'
    }
];

const AutomationsStatusBadge: React.FC<{status: AutomationStatus}> = ({status}) => {
    switch (status) {
    case 'active':
        return <Badge variant="success">Active</Badge>;
    case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
    default: {
        const invalidStatus: never = status;
        throw new Error(`Unhandled status: ${invalidStatus}`);
    }
    }
};

const AutomationsList: React.FC = () => {
    return (
        <Table className="flex table-fixed flex-col lg:table" data-testid="automations-list">
            <TableHeader className="hidden lg:visible! lg:table-header-group!">
                <TableRow>
                    <TableHead className="w-auto px-4">Name</TableHead>
                    <TableHead className="w-24 px-4">Steps</TableHead>
                    <TableHead className="w-28 px-4">Status</TableHead>
                    <TableHead className="w-32 px-4">Last run</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody className="flex flex-col lg:table-row-group">
                {automations.map(automation => (
                    <TableRow
                        key={automation.id}
                        className="group relative grid w-full cursor-pointer grid-cols-2 items-center gap-x-4 p-2 hover:bg-muted/50 lg:table-row lg:p-0"
                        data-testid="automation-list-row"
                    >
                        <TableCell className="lg:w-auto lg:p-4">
                            <a
                                className="before:absolute before:top-0 before:left-0 before:z-10 before:h-full before:w-full"
                                href={`#/automations/${automation.id}`}
                            >
                                <span className="block truncate text-lg font-medium">
                                    {automation.name}
                                </span>
                            </a>
                        </TableCell>
                        <TableCell className="lg:p-4">
                            <span className="text-muted-foreground">
                                {formatNumber(automation.steps)} {automation.steps === 1 ? 'step' : 'steps'}
                            </span>
                        </TableCell>
                        <TableCell className="lg:p-4">
                            <AutomationsStatusBadge status={automation.status} />
                        </TableCell>
                        <TableCell className="lg:p-4">
                            <span className="text-muted-foreground">{automation.lastRun}</span>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};

export default AutomationsList;
