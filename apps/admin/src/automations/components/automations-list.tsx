import AutomationStatusBadge from './automation-status-badge';
import React from 'react';
import type {Automation} from '@tryghost/admin-x-framework/api/automations';
import {Link} from '@tryghost/admin-x-framework';
import {Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@tryghost/shade/components';
import {cn, formatNumber} from '@tryghost/shade/utils';
import {formatLastRun, getAutomationRunAnalytics} from '@/automations/run-analytics';

const AUTOMATION_DESCRIPTIONS: Record<string, string> = {
    'member-welcome-email-free': 'Welcome new free members after they sign up.',
    'member-welcome-email-paid': 'Welcome new paid members after they start their subscription.'
};

interface AutomationsListProps {
    automations?: Automation[];
    isLoading?: boolean;
}

const gridColumns = 'grid grid-cols-[1fr_auto] lg:grid-cols-[minmax(0,1fr)_170px_130px_130px_110px]';

const AutomationsListSkeleton: React.FC = () => {
    return (
        <Table className="flex flex-col border-t" data-testid="automations-list-loading">
            <TableBody className="flex flex-col">
                {Array.from({length: 2}, (_, index) => (
                    <TableRow
                        key={index}
                        aria-hidden="true"
                        className={cn('w-full items-center gap-x-4 p-2 lg:p-0', gridColumns)}
                    >
                        <TableCell className="min-w-0 lg:p-4">
                            <Skeleton className="mb-1 h-3 w-48 max-w-full " />
                            <Skeleton className="h-3 w-80 max-w-full" />
                        </TableCell>
                        <TableCell className="hidden lg:block lg:p-4"><Skeleton className="h-3 w-20" /></TableCell>
                        <TableCell className="hidden lg:block lg:p-4"><Skeleton className="h-3 w-10" /></TableCell>
                        <TableCell className="hidden lg:block lg:p-4"><Skeleton className="h-3 w-10" /></TableCell>
                        <TableCell className="text-right lg:w-32 lg:p-4">
                            <Skeleton className="ml-auto h-3 w-16" />
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
        <Table className="flex flex-col border-t" data-testid="automations-list">
            <TableHeader className="hidden lg:flex lg:flex-col">
                <TableRow className={cn('w-full items-center gap-x-4 border-b hover:bg-transparent', gridColumns)}>
                    <TableHead className="lg:px-4">Name</TableHead>
                    <TableHead className="lg:px-4">Last run</TableHead>
                    <TableHead className="lg:px-4">In progress</TableHead>
                    <TableHead className="lg:px-4">Completed</TableHead>
                    <TableHead className="lg:px-4">Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody className="flex flex-col">
                {automations.map((automation) => {
                    const description = AUTOMATION_DESCRIPTIONS[automation.slug];
                    const metrics = getAutomationRunAnalytics(automation);

                    return (
                        <TableRow
                            key={automation.slug}
                            className={cn('relative w-full cursor-pointer items-center gap-x-4 p-2 hover:bg-table-row-hover lg:p-0', gridColumns)}
                            data-testid="automation-list-row"
                        >
                            <TableCell className="static min-w-0 lg:p-4">
                                <Link
                                    className="before:absolute before:inset-0 before:z-10 before:rounded-sm focus-visible:outline-hidden focus-visible:before:ring-2 focus-visible:before:ring-focus-ring"
                                    to={`/automations/${automation.id}`}
                                >
                                    <span className="block text-md font-semibold">
                                        {automation.name}
                                    </span>
                                </Link>
                                {description && (
                                    <span className="block text-muted-foreground">
                                        {description}
                                    </span>
                                )}
                            </TableCell>
                            <TableCell className={cn('hidden lg:block lg:p-4', !metrics.lastRunAt && 'text-muted-foreground')}>
                                {formatLastRun(metrics.lastRunAt)}
                            </TableCell>
                            <TableCell className={cn('hidden lg:block lg:p-4', metrics.inProgress === 0 && 'text-muted-foreground')}>
                                {formatNumber(metrics.inProgress)}
                            </TableCell>
                            <TableCell className={cn('hidden lg:block lg:p-4', metrics.completed === 0 && 'text-muted-foreground')}>
                                {formatNumber(metrics.completed)}
                            </TableCell>
                            <TableCell className="lg:p-4">
                                <AutomationStatusBadge status={automation.status} />
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
};

export default AutomationsList;
