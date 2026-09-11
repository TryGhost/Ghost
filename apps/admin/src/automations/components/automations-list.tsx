import AutomationStatusBadge from './automation-status-badge';
import React from 'react';
import type { AutomationBrowseItem } from '@tryghost/admin-x-framework/api/automations';
import { Link } from '@tryghost/admin-x-framework';
import {
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@tryghost/shade/components';
import { cn, formatNumber, formatTimestamp } from '@tryghost/shade/utils';

const AUTOMATION_DESCRIPTIONS: Record<string, string> = {
  'member-welcome-email-free': 'Welcome new free members after they sign up.',
  'member-welcome-email-paid': 'Welcome new paid members after they start their subscription.',
};

// Widths are scoped to `lg` because below that the stats lay out on the row's
// grid rather than in table cells, where a fixed width would fight the columns.
const AUTOMATION_STAT_COLUMNS = [
  {
    key: 'lastEntry',
    label: 'Last entry',
    widthClassName: 'lg:w-40',
    skeletonWidthClassName: 'w-20',
  },
  {
    key: 'totalEntries',
    label: 'Total entries',
    widthClassName: 'lg:w-32',
    skeletonWidthClassName: 'w-10',
  },
  {
    key: 'inProgressEntries',
    label: 'In progress',
    widthClassName: 'lg:w-32',
    skeletonWidthClassName: 'w-10',
  },
] as const;

const handleRowClick = (event: React.MouseEvent<HTMLTableRowElement>) => {
  if (
    event.defaultPrevented ||
    !(event.target instanceof Element) ||
    event.target.closest('a, button, input, select, textarea')
  ) {
    return;
  }

  event.currentTarget.querySelector('a')?.click();
};

interface AutomationsListProps {
  automations?: AutomationBrowseItem[];
  isLoading?: boolean;
}

const AutomationsListSkeleton: React.FC = () => {
  return (
    <Table
      aria-busy="true"
      aria-label="Automations"
      className="flex table-auto flex-col lg:table"
      data-testid="automations-list-loading"
    >
      <TableBody className="flex flex-col lg:table-row-group">
        {Array.from({ length: 2 }, (_, index) => (
          <TableRow
            key={index}
            aria-hidden="true"
            className="grid w-full grid-cols-[repeat(3,minmax(0,1fr))_auto] items-center gap-x-4 gap-y-3 px-2 py-6 lg:table-row lg:gap-0 lg:p-0"
          >
            <TableCell className="col-span-3 row-start-1 min-w-0 p-0 lg:table-cell lg:p-4">
              <Skeleton className="mb-1 h-3 w-48 max-w-full " />
              <Skeleton className="h-3 w-80 max-w-full" />
            </TableCell>
            {AUTOMATION_STAT_COLUMNS.map((column) => (
              <TableCell
                key={column.key}
                className={cn(
                  'row-start-2 min-w-0 p-0 lg:table-cell lg:p-4',
                  column.widthClassName,
                )}
              >
                <Skeleton className={cn('h-3', column.skeletonWidthClassName)} />
              </TableCell>
            ))}
            <TableCell className="col-start-4 row-start-1 w-auto p-0 text-right lg:table-cell lg:w-28 lg:p-4 lg:text-left">
              <Skeleton className="ml-auto h-3 w-16 lg:ml-0" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

const AutomationsList: React.FC<AutomationsListProps> = ({
  automations = [],
  isLoading = false,
}) => {
  if (isLoading) {
    return <AutomationsListSkeleton />;
  }

  const showRunAnalytics = automations.every((automation) => automation.stats !== undefined);

  return (
    <Table
      aria-label="Automations"
      className={cn('flex table-auto flex-col lg:table', !showRunAnalytics && 'border-t')}
      data-testid="automations-list"
    >
      {showRunAnalytics && (
        <TableHeader className="hidden lg:table-header-group">
          <TableRow className="hover:bg-transparent">
            <TableHead className="lg:px-4" scope="col">
              Name
            </TableHead>
            {AUTOMATION_STAT_COLUMNS.map((column) => (
              <TableHead
                key={column.key}
                className={cn('lg:px-4', column.widthClassName)}
                scope="col"
              >
                {column.label}
              </TableHead>
            ))}
            <TableHead className="w-28 lg:px-4" scope="col">
              Status
            </TableHead>
          </TableRow>
        </TableHeader>
      )}
      <TableBody className="flex flex-col lg:table-row-group">
        {automations.map((automation) => {
          const description = AUTOMATION_DESCRIPTIONS[automation.slug];
          const lastEntry = automation.stats?.last_run_created_at;
          const totalEntries = automation.stats?.total_run_count ?? 0;
          const inProgressEntries = automation.stats?.in_progress_run_count ?? 0;
          const statCells = {
            lastEntry: {
              content: lastEntry ? (
                <time dateTime={lastEntry}>{formatTimestamp(lastEntry)}</time>
              ) : (
                'Never'
              ),
              isEmpty: !lastEntry,
            },
            totalEntries: {
              content: formatNumber(totalEntries),
              isEmpty: totalEntries === 0,
            },
            inProgressEntries: {
              content: formatNumber(inProgressEntries),
              isEmpty: inProgressEntries === 0,
            },
          };

          return (
            <TableRow
              key={automation.slug}
              className="grid w-full cursor-pointer grid-cols-[repeat(3,minmax(0,1fr))_auto] items-center gap-x-4 gap-y-3 px-2 py-6 hover:bg-table-row-hover has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-[-2px] has-[:focus-visible]:outline-focus-ring lg:table-row lg:gap-0 lg:p-0"
              data-testid="automation-list-row"
              onClick={handleRowClick}
            >
              <TableHead
                className="col-span-3 row-start-1 h-auto min-w-0 p-0 text-left text-base font-normal tracking-normal text-foreground lg:table-cell lg:p-4"
                scope="row"
              >
                <Link
                  className="rounded-sm focus-visible:outline-hidden"
                  to={`/automations/${automation.id}`}
                >
                  <span className="block text-md font-semibold">{automation.name}</span>
                </Link>
                {description && <span className="block text-muted-foreground">{description}</span>}
              </TableHead>
              {showRunAnalytics &&
                AUTOMATION_STAT_COLUMNS.map((column) => {
                  const cell = statCells[column.key];

                  return (
                    <TableCell
                      key={column.key}
                      className={cn(
                        'row-start-2 flex min-w-0 flex-col p-0 lg:table-cell lg:p-4',
                        column.widthClassName,
                        cell.isEmpty && 'text-muted-foreground',
                      )}
                    >
                      {cell.content}
                      {/* The column headers are hidden below `lg`, so each stat
                          carries its own label there. */}
                      <span className="mt-0.5 text-sm leading-tight whitespace-nowrap text-muted-foreground lg:hidden">
                        {column.label}
                      </span>
                    </TableCell>
                  );
                })}
              <TableCell
                className={cn(
                  'col-start-4 row-start-1 w-auto p-0 text-right lg:table-cell lg:p-4',
                  showRunAnalytics ? 'lg:w-28 lg:text-left' : 'lg:w-32',
                )}
              >
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
