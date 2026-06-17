import AutomationStatusBadge from './automation-status-badge';
import React from 'react';
import moment from 'moment-timezone';
import {Automation} from '@tryghost/admin-x-framework/api/automations';
import {Link} from '@tryghost/admin-x-framework';
import {Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@tryghost/shade/components';
import {cn, formatNumber} from '@tryghost/shade/utils';

const AUTOMATION_DESCRIPTIONS: Record<string, string> = {
    'member-welcome-email-free': 'Onboard new free members with a short welcome email.',
    'member-welcome-email-paid': 'Greet new paid members and point them at member-only content.'
};

// TODO: replace with real analytics — see NY-1347
const RUN_STATS_BY_SLUG: Record<string, {inProgress: number; completed: number}> = {
    'member-welcome-email-free': {inProgress: 0, completed: 1247},
    'member-welcome-email-paid': {inProgress: 3, completed: 842}
};
const DEFAULT_RUN_STATS = {inProgress: 0, completed: 0};
const CREATED_BY_SLUG: Record<string, string> = {
    'member-welcome-email-free': '3 days ago',
    'member-welcome-email-paid': '2026-02-12'
};
const DEFAULT_CREATED = '2026-02-12';
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
// Matches the members list pattern (members-list-item.tsx) — always shows the year, no current-year suppression.
const formatCreated = (raw: string): string => (ISO_DATE_PATTERN.test(raw) ? moment.utc(raw).format('D MMM YYYY') : raw);

interface AutomationsListProps {
    automations?: Automation[];
    isLoading?: boolean;
}

const ROW_GRID_CLASS = 'grid w-full grid-cols-[1fr_auto_auto_auto_auto] items-center gap-x-4 p-2 lg:table-row lg:p-0';

const AutomationsListSkeleton: React.FC = () => {
    return (
        <Table className="flex table-fixed flex-col lg:table" data-testid="automations-list-loading">
            <TableBody className="flex flex-col lg:table-row-group">
                {Array.from({length: 2}, (_, index) => (
                    <TableRow
                        key={index}
                        aria-hidden="true"
                        className={ROW_GRID_CLASS}
                    >
                        <TableCell className="min-w-0 lg:p-4">
                            <Skeleton className="mb-1 h-3 w-48 max-w-full " />
                            <Skeleton className="h-3 w-80 max-w-full" />
                        </TableCell>
                        <TableCell className="lg:w-28 lg:p-4">
                            <Skeleton className="h-3 w-20" />
                        </TableCell>
                        <TableCell className="text-right lg:w-28 lg:p-4">
                            <Skeleton className="ml-auto h-3 w-10" />
                        </TableCell>
                        <TableCell className="text-right lg:w-28 lg:p-4">
                            <Skeleton className="ml-auto h-3 w-12" />
                        </TableCell>
                        <TableCell className="lg:w-32 lg:py-4 lg:pr-4 lg:pl-8">
                            <Skeleton className="h-3 w-16" />
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
            <TableHeader className="hidden lg:visible! lg:table-header-group!">
                <TableRow>
                    <TableHead className="w-auto px-4">Name</TableHead>
                    <TableHead className="w-28 px-4">Created</TableHead>
                    <TableHead className="w-28 px-4 text-right whitespace-nowrap">In progress</TableHead>
                    <TableHead className="w-28 px-4 text-right whitespace-nowrap">Completed</TableHead>
                    <TableHead className="w-32 pr-4 pl-8">Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody className="flex flex-col lg:table-row-group">
                {automations.map((automation) => {
                    const description = AUTOMATION_DESCRIPTIONS[automation.slug];
                    const created = formatCreated(CREATED_BY_SLUG[automation.slug] ?? DEFAULT_CREATED);
                    const {inProgress, completed} = RUN_STATS_BY_SLUG[automation.slug] ?? DEFAULT_RUN_STATS;

                    return (
                        <TableRow
                            key={automation.slug}
                            className={`cursor-pointer ${ROW_GRID_CLASS}`}
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
                            <TableCell className="whitespace-nowrap lg:w-28 lg:p-4">
                                {created}
                            </TableCell>
                            <TableCell className={cn('text-right tabular-nums lg:w-28 lg:p-4', inProgress === 0 && 'text-muted-foreground')}>
                                <span className="inline-flex items-center gap-2">
                                    {inProgress > 0 && (
                                        <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-amber-500" />
                                    )}
                                    {formatNumber(inProgress)}
                                </span>
                            </TableCell>
                            <TableCell className={cn('text-right tabular-nums lg:w-28 lg:p-4', completed === 0 && 'text-muted-foreground')}>
                                {formatNumber(completed)}
                            </TableCell>
                            <TableCell className="lg:w-32 lg:py-4 lg:pr-4 lg:pl-8">
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
