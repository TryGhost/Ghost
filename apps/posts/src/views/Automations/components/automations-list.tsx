import AutomationStatusBadge from './automation-status-badge';
import React from 'react';
import {Automation} from '@tryghost/admin-x-framework/api/automations';
import {Link} from '@tryghost/admin-x-framework';
import {Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@tryghost/shade/components';
import {formatNumber} from '@tryghost/shade/utils';

const AUTOMATION_DESCRIPTIONS: Record<string, string> = {
    'member-welcome-email-free': 'Onboard new free members with a short welcome email.',
    'member-welcome-email-paid': 'Greet new paid members and point them at member-only content.'
};

// TODO: replace with real analytics — see NY-1347
const STATIC_RUNS = 1247;
const CREATED_BY_SLUG: Record<string, string> = {
    'member-welcome-email-free': '3 days ago',
    'member-welcome-email-paid': 'Feb 12, 2026'
};
const DEFAULT_CREATED = 'Feb 12, 2026';

interface AutomationsListProps {
    automations?: Automation[];
    isLoading?: boolean;
}

const ROW_GRID_CLASS = 'grid w-full grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 p-2 lg:table-row lg:p-0';

const AutomationsListSkeleton: React.FC = () => {
    return (
        <Table className="flex table-fixed flex-col border-t lg:table" data-testid="automations-list-loading">
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
                        <TableCell className="text-right lg:w-24 lg:p-4">
                            <Skeleton className="ml-auto h-3 w-12" />
                        </TableCell>
                        <TableCell className="text-right lg:w-32 lg:p-4">
                            <Skeleton className="ml-auto h-3 w-20" />
                        </TableCell>
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
        <Table className="flex table-fixed flex-col border-t lg:table" data-testid="automations-list">
            <TableHeader className="hidden lg:table-header-group">
                <TableRow>
                    <TableHead className="lg:p-4">Name</TableHead>
                    <TableHead className="text-right lg:w-24 lg:p-4">Runs</TableHead>
                    <TableHead className="text-right lg:w-32 lg:p-4">Created</TableHead>
                    <TableHead className="text-right lg:w-32 lg:p-4">Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody className="flex flex-col lg:table-row-group">
                {automations.map((automation) => {
                    const description = AUTOMATION_DESCRIPTIONS[automation.slug];
                    const created = CREATED_BY_SLUG[automation.slug] ?? DEFAULT_CREATED;

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
                            <TableCell className="text-right tabular-nums lg:w-24 lg:p-4">
                                {formatNumber(STATIC_RUNS)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground lg:w-32 lg:p-4">
                                {created}
                            </TableCell>
                            <TableCell className="text-right lg:w-32 lg:p-4">
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
