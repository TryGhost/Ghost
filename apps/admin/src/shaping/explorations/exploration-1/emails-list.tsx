import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataList,
  DataListBody,
  DataListItemContent,
  DataListRow,
  EmptyIndicator,
  SkeletonTable,
} from '@tryghost/shade/components';
import { CAPS_LABEL } from './type';
import {
  LucideIcon,
  cn,
  formatDisplayDate,
  formatNumber,
  formatPercentage,
} from '@tryghost/shade/utils';
import { getPeriodText } from '@/shared/analytics/chart-helpers';
import { getSiteTimezone } from '@tryghost/admin-x-framework/utils/get-site-timezone';
import { useAnalyticsData } from '@/shared/analytics/use-analytics-data';
import { useEmailTrackClicks, useEmailTrackOpens } from '@tryghost/admin-x-framework/api/settings';
import { useNavigate } from '@tryghost/admin-x-framework';
import {
  type TopNewslettersOrder,
  useNewsletterStatsWithRangeSplit,
} from '@/analytics/hooks/use-newsletter-stats-with-range';

// EXPLORATION ONLY — never merge (see src/shaping/README.md).
//
// Exploration 1's Emails, in place of Newsletters' "Top newsletters" table:
// each email sent to the picked newsletter, as a Web traffic list (the same
// Card and DataList pieces, so web-traffic.css styles it the same way). The
// title row carries the subtitle and the column labels (Date, Sent, Opens,
// Clicks), which sort the list; each row is the email's post title, its send
// date and its numbers. On hover a row's open and click rates turn into their
// counts, as in today's table.
//
// No "View all": Ghost returns at most 20 emails for the range, so every row
// it sends is shown, with no fuller list to open.

// Every column's width (the date's too), so the labels sit over their values
const COLUMN = 'w-[96px] shrink-0 text-right';

interface Column {
  key: TopNewslettersOrder;
  label: string;
}

// The title row's column labels, in the caps label style (type.ts); a click
// sorts by that column (the sorted one in the default colour)
const ColumnLabel: React.FC<{
  column: Column;
  sortBy: TopNewslettersOrder;
  onSort: (sort: TopNewslettersOrder) => void;
  className?: string;
}> = ({ column, sortBy, onSort, className }) => (
  <button
    className={cn(
      CAPS_LABEL,
      'cursor-pointer transition-colors hover:text-foreground',
      sortBy === column.key && 'text-foreground',
      className,
    )}
    type="button"
    onClick={() => onSort(column.key)}
  >
    {column.label}
  </button>
);

type EmailRow = {
  post_id: string;
  post_title: string;
  send_date: string;
  sent_to: number;
  total_opens: number;
  open_rate: number;
  total_clicks?: number;
  click_rate?: number;
};

const EmailsTable: React.FC<{ rows: EmailRow[]; isClicksLoading: boolean }> = ({
  rows,
  isClicksLoading,
}) => {
  const navigate = useNavigate();
  const { settings } = useAnalyticsData();
  const siteTimezone = getSiteTimezone(settings);
  const opensEnabled = useEmailTrackOpens();
  const clicksEnabled = useEmailTrackClicks();

  return (
    <DataList>
      <DataListBody>
        {rows.map((row) => (
          <DataListRow
            key={row.post_id}
            className="group/row hover:cursor-pointer"
            onClick={() => navigate(`/posts/analytics/${row.post_id}/`)}
          >
            <DataListItemContent className="max-w-none min-w-0 flex-1">
              {/* A leading mail icon, as Top content's rows lead with their type */}
              <div className="flex items-center space-x-2 overflow-hidden">
                <LucideIcon.Mail
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground"
                />
                <div className="truncate">{row.post_title}</div>
              </div>
            </DataListItemContent>
            <div className="z-10 flex shrink-0 items-center gap-2 font-mono text-md">
              <span className={cn(COLUMN, 'font-sans')}>
                {formatDisplayDate(row.send_date, siteTimezone)}
              </span>
              <span className={COLUMN}>{formatNumber(row.sent_to)}</span>
              {opensEnabled && (
                <span className={COLUMN}>
                  <span className="group-hover/row:hidden">{formatPercentage(row.open_rate)}</span>
                  <span className="hidden group-hover/row:inline">
                    {formatNumber(row.total_opens)}
                  </span>
                </span>
              )}
              {clicksEnabled && (
                <span className={COLUMN}>
                  {isClicksLoading ? (
                    <span className="inline-block h-4 w-8 animate-pulse rounded bg-gray-200" />
                  ) : (
                    <>
                      <span className="group-hover/row:hidden">
                        {formatPercentage(row.click_rate ?? 0)}
                      </span>
                      <span className="hidden group-hover/row:inline">
                        {formatNumber(row.total_clicks ?? 0)}
                      </span>
                    </>
                  )}
                </span>
              )}
            </div>
          </DataListRow>
        ))}
      </DataListBody>
    </DataList>
  );
};

const EmailsList: React.FC<{
  range: number;
  selectedNewsletterId: string | null | undefined;
  shouldFetchStats: boolean;
}> = ({ range, selectedNewsletterId, shouldFetchStats }) => {
  const [sortBy, setSortBy] = useState<TopNewslettersOrder>('open_rate desc');
  const opensEnabled = useEmailTrackOpens();
  const clicksEnabled = useEmailTrackClicks();
  const { data, isLoading, isClicksLoading } = useNewsletterStatsWithRangeSplit(
    range,
    sortBy,
    selectedNewsletterId || undefined,
    shouldFetchStats,
  );
  const rows = (data?.stats ?? []) as EmailRow[];

  const columns: Column[] = [
    { key: 'sent_to desc', label: 'Sent' },
    ...(opensEnabled ? [{ key: 'open_rate desc' as const, label: 'Opens' }] : []),
    ...(clicksEnabled ? [{ key: 'click_rate desc' as const, label: 'Clicks' }] : []),
  ];

  // The title row: the subtitle, then the column labels over their numbers
  const titleRow = (
    <div className="flex items-center justify-between gap-6 px-6 pt-6 pb-5">
      <CardHeader className="p-0">
        <CardTitle>Emails</CardTitle>
      </CardHeader>
      <div className="flex shrink-0 items-center gap-2">
        <ColumnLabel
          className={COLUMN}
          column={{ key: 'date desc', label: 'Date' }}
          sortBy={sortBy}
          onSort={setSortBy}
        />
        {columns.map((column) => (
          <ColumnLabel
            key={column.key}
            className={COLUMN}
            column={column}
            sortBy={sortBy}
            onSort={setSortBy}
          />
        ))}
      </div>
    </div>
  );

  return (
    <Card className="group/datalist" data-testid="emails-card">
      {titleRow}
      <CardContent className="overflow-hidden">
        {isLoading || !data ? (
          <SkeletonTable className="mt-3" />
        ) : rows.length > 0 ? (
          <EmailsTable isClicksLoading={isClicksLoading} rows={rows} />
        ) : (
          <EmptyIndicator className="w-full py-20" title={`No emails sent ${getPeriodText(range)}`}>
            <LucideIcon.Mail strokeWidth={1.5} />
          </EmptyIndicator>
        )}
      </CardContent>
    </Card>
  );
};

export default EmailsList;
