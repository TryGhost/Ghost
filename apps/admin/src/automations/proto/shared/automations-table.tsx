import React from 'react';
import type {AutomationDetail} from '@tryghost/admin-x-framework/api/automations';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@tryghost/shade/components';
import {cn, formatNumber} from '@tryghost/shade/utils';
import {Link} from '@tryghost/admin-x-framework';
import {AUTOMATION_DESCRIPTIONS, getScenario} from './mock';
import {startedLabel} from './member-runs';
import {StatusBadge} from './status-badge';
import {useVersionLink} from './use-version-link';

// The automations list table, shared by every proto concept that models real
// AutomationDetail records (surface, dashboard) — same columns, same run
// metrics (via getScenario), same row shape. Only the link destination
// differs per concept, via `basePath`.

// Last entry, worded by Shade's formatTimestamp like every other timestamp in
// Ghost — "4 hr ago", "Yesterday", then a short date.
//
// This was a hand-rolled ladder with its own vocabulary ("4 hours ago", "2
// minutes ago"), which is what the runs table used to do before it moved to the
// shared formatter. The two then disagreed about the same moment: a run read
// "4 hr ago" in the detail pane and "4 hours ago" in the list.
//
// startedLabel rather than formatTimestamp directly, because fixtures are
// authored against a fixed clock and have to be shifted onto the real one first
// — member-runs owns that shift and exports it for exactly this reason.
const relRunDate = (iso: string | null): string => (iso ? startedLabel(iso) : 'Never');

// Shared grid template so the header and every row line up. Mobile collapses
// to name + status; the entry/count columns appear from `lg` up.
//
// The four data columns are one width, and the name takes whatever is left. They
// used to be 170/130/130/110, sized to their own content — which was invisible
// while every column was left-aligned, and obvious the moment the figures moved
// to the right edge: the gaps between a heading and its own numbers were all
// different, so the block read as drifting rather than as a grid. Equal columns
// put every value the same distance from the one beside it.
const gridCols = 'grid grid-cols-[1fr_auto] lg:grid-cols-[minmax(0,1fr)_130px_130px_130px_130px]';

// text-right + font-mono + text-sm is how every numeric table column in the app
// renders — analytics newsletters, analytics growth, growth sources and post
// analytics all carry this exact string. Numbers that stack down a column are
// read by comparing them, and mono's fixed advance is what lets the digits line
// up to be compared; the headline figures elsewhere stay sans because they're
// read once rather than against each other.
const MetricCell: React.FC<{value: number}> = ({value}) => (
    <TableCell className={cn('hidden text-right font-mono text-sm lg:block lg:p-4', value === 0 && 'text-muted-foreground')}>
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
                {/* Right-aligned to sit over the right-aligned figures below, the
                    same pairing the analytics tables use. */}
                <TableHead className="text-right lg:px-4">Total entries</TableHead>
                <TableHead className="text-right lg:px-4">In progress</TableHead>
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
