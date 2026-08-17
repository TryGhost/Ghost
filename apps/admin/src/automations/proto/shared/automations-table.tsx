import React from 'react';
import type {AutomationDetail} from '@tryghost/admin-x-framework/api/automations';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@tryghost/shade/components';
import {cn, formatNumber} from '@tryghost/shade/utils';
import {Link} from '@tryghost/admin-x-framework';
import {AUTOMATION_DESCRIPTIONS, getScenario} from './mock';
import {StatusBadge} from './status-badge';
import {useVersionLink} from './use-version-link';

// The automations list table, shared by every proto concept that models real
// AutomationDetail records (surface, dashboard) — same columns, same run
// metrics (via getScenario), same row shape. Only the link destination
// differs per concept, via `basePath`.

// Deterministic "now" so relative dates stay consistent across concepts and
// don't drift as real time passes while the proto is being reviewed.
const NOW_MS = new Date('2026-07-21T09:12:00Z').getTime();

const relRunDate = (iso: string | null): string => {
    if (!iso) {
        return 'Never';
    }
    const mins = Math.round((NOW_MS - new Date(iso).getTime()) / 60_000);
    if (mins < 1) {
        return 'Just now';
    }
    if (mins < 60) {
        return `${mins} minute${mins === 1 ? '' : 's'} ago`;
    }
    const hours = Math.round(mins / 60);
    if (hours < 24) {
        return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    }
    const days = Math.round(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
};

// Shared grid template so the header and every row line up. Mobile collapses
// to name + status; the entry/count columns appear from `lg` up.
const gridCols = 'grid grid-cols-[1fr_auto] lg:grid-cols-[minmax(0,1fr)_170px_130px_130px_110px]';

const MetricCell: React.FC<{value: number}> = ({value}) => (
    <TableCell className={cn('hidden lg:block lg:p-4', value === 0 && 'text-muted-foreground')}>
        {formatNumber(value)}
    </TableCell>
);

const AutomationRow: React.FC<{automation: AutomationDetail; basePath: string}> = ({automation, basePath}) => {
    const toVersioned = useVersionLink();
    const description = AUTOMATION_DESCRIPTIONS[automation.slug];
    const {metrics} = getScenario(automation.id) ?? {metrics: undefined};

    return (
        <TableRow
            className={cn('relative w-full cursor-pointer items-center gap-x-4 p-2 hover:bg-table-row-hover lg:p-0', gridCols)}
            data-testid="automation-list-row"
        >
            <TableCell className="static min-w-0 lg:p-4">
                <Link
                    className="before:absolute before:inset-0 before:z-10 before:rounded-sm focus-visible:outline-hidden focus-visible:before:ring-2 focus-visible:before:ring-focus-ring"
                    to={toVersioned(`${basePath}/${automation.id}`)}
                >
                    <span className="block text-md font-semibold">{automation.name}</span>
                </Link>
                {description && <span className="block text-muted-foreground">{description}</span>}
            </TableCell>
            <TableCell className={cn('hidden lg:block lg:p-4', !metrics?.last_enrolled_at && 'text-muted-foreground')}>
                {relRunDate(metrics?.last_enrolled_at ?? null)}
            </TableCell>
            {/* Total entries is the number the detail page leads with, so the list
                and the automation agree on the headline figure — that's the one people
                cross-check. Completed dropped out to make room: how many are still
                moving matters more at a glance than how many have finished. */}
            <MetricCell value={metrics?.enrollments ?? 0} />
            <MetricCell value={metrics?.in_progress ?? 0} />
            <TableCell className="lg:p-4">
                <StatusBadge status={automation.status} />
            </TableCell>
        </TableRow>
    );
};

interface AutomationsTableProps {
    automations: AutomationDetail[];
    basePath: string;
}

// Column headers + body. `data-testid` stays "automations-list" — callers
// don't need to pass one, it doesn't vary per concept.
export const AutomationsTable: React.FC<AutomationsTableProps> = ({automations, basePath}) => (
    <Table className="flex flex-col" data-testid="automations-list">
        <TableHeader className="hidden lg:flex lg:flex-col">
            <TableRow className={cn('w-full items-center gap-x-4 border-b hover:bg-transparent', gridCols)}>
                <TableHead className="lg:px-4">Name</TableHead>
                <TableHead className="lg:px-4">Last entry</TableHead>
                <TableHead className="lg:px-4">Total entries</TableHead>
                <TableHead className="lg:px-4">In progress</TableHead>
                <TableHead className="lg:px-4">Status</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody className="flex flex-col">
            {automations.map(automation => (
                <AutomationRow key={automation.id} automation={automation} basePath={basePath} />
            ))}
        </TableBody>
    </Table>
);
