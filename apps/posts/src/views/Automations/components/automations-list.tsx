import React from 'react';
import {Automation} from '@tryghost/admin-x-framework/api/automations';
import {Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@tryghost/shade/components';

const AUTOMATION_DESCRIPTIONS: Record<string, string> = {
    'member-welcome-email-free': 'Onboard new free members with a short welcome email.',
    'member-welcome-email-paid': 'Greet new paid members and point them at member-only content.'
};

const AutomationsStatusBadge: React.FC<{status: Automation['status']}> = ({status}) => {
    switch (status) {
    case 'active':
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green/20 px-2 py-0.5 text-xs font-medium text-green">
                <span className="size-1.5 rounded-full bg-green" />
                LIVE
            </span>
        );
    case 'inactive':
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                OFF
            </span>
        );
    default: {
        const invalidStatus: never = status;
        throw new Error(`Unhandled status: ${invalidStatus}`);
    }
    }
};

interface AutomationsListProps {
    automations?: Automation[];
    isLoading?: boolean;
}

const AutomationsListSkeleton: React.FC = () => {
    return (
        <Table className="flex table-fixed flex-col lg:table" data-testid="automations-list-loading">
            <TableHeader className="hidden lg:table-header-group!">
                <TableRow>
                    <TableHead className="w-auto px-4">Automation</TableHead>
                    <TableHead className="w-32 px-4">Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody className="flex flex-col lg:table-row-group">
                {Array.from({length: 2}, (_, index) => (
                    <TableRow
                        key={index}
                        aria-hidden="true"
                        className="grid w-full grid-cols-[1fr_auto] items-center gap-x-4 p-2 lg:table-row lg:p-0"
                    >
                        <TableCell className="min-w-0 lg:p-4">
                            <Skeleton className="mb-1 h-5 w-48 max-w-full" />
                            <Skeleton className="h-5 w-80 max-w-full" />
                        </TableCell>
                        <TableCell className="lg:w-32 lg:p-4">
                            <Skeleton className="h-5 w-16" />
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};

const AutomationsList: React.FC<AutomationsListProps> = ({automations = [], isLoading = false}) => {
    if (isLoading) {
        return <AutomationsListSkeleton />;
    }

    return (
        <Table className="flex table-fixed flex-col lg:table" data-testid="automations-list">
            <TableHeader className="hidden lg:table-header-group!">
                <TableRow>
                    <TableHead className="w-auto px-4">Automation</TableHead>
                    <TableHead className="w-32 px-4">Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody className="flex flex-col lg:table-row-group">
                {automations.map((automation) => {
                    const description = AUTOMATION_DESCRIPTIONS[automation.slug];

                    return (
                        <TableRow
                            key={automation.slug}
                            className="grid w-full cursor-pointer grid-cols-[1fr_auto] items-center gap-x-4 p-2 lg:table-row lg:p-0"
                            data-testid="automation-list-row"
                        >
                            <TableCell className="static min-w-0 lg:p-4">
                                <a
                                    className="before:absolute before:inset-0 before:z-10 before:rounded-sm focus-visible:outline-hidden focus-visible:before:ring-2 focus-visible:before:ring-focus-ring"
                                    href={`#/automations/${automation.slug}`}
                                >
                                    <span className="block font-medium">
                                        {automation.name}
                                    </span>
                                </a>
                                {description && (
                                    <span className="block text-muted-foreground">
                                        {description}
                                    </span>
                                )}
                            </TableCell>
                            <TableCell className="lg:w-32 lg:p-4">
                                <AutomationsStatusBadge status={automation.status} />
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
};

export default AutomationsList;
