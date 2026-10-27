import React, { useState } from 'react';
import SourceIcon from '@/shared/analytics/source-icon';
import {
  type BaseSourceData,
  type ProcessedSourceData,
  extendSourcesWithPercentages,
  processSources,
} from '@tryghost/admin-x-framework';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataList,
  DataListBody,
  DataListHead,
  DataListHeader,
  DataListItemContent,
  DataListItemValue,
  DataListItemValueAbs,
  DataListItemValuePerc,
  DataListRow,
  EmptyIndicator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SkeletonTable,
} from '@tryghost/shade/components';
import { LucideIcon, formatNumber, formatPercentage } from '@tryghost/shade/utils';
import { getPeriodText } from '@/shared/analytics/chart-helpers';
import { ViewAllButton, VisitorsHeader } from './visitors-header';

// EXPLORATION ONLY — never merge (see src/shaping/README.md).
//
// Exploration 1's Top sources: a copy of
// analytics/views/stats/web/components/sources-card.tsx with no description
// or column header row. "Visitors" sits at the right of the title row, and
// "View all" is a plain text link at the bottom left (visitors-header.tsx).

// Default source icon URL - apps can override this
const DEFAULT_SOURCE_ICON_URL = 'https://www.google.com/s2/favicons?domain=ghost.org&sz=64';

interface SourcesTableProps {
  data: ProcessedSourceData[] | null;
  range?: number;
  defaultSourceIconUrl?: string;
  tableHeader: boolean;
  onSourceClick?: (source: string) => void;
}

const SourcesTable: React.FC<SourcesTableProps> = ({
  tableHeader,
  data,
  defaultSourceIconUrl = DEFAULT_SOURCE_ICON_URL,
  onSourceClick,
}) => {
  const handleRowClick = (row: ProcessedSourceData) => {
    if (onSourceClick) {
      // Pass empty string for "Direct" traffic, otherwise use the source value
      onSourceClick(row.isDirectTraffic ? '' : row.source);
    }
  };

  return (
    <DataList>
      {tableHeader && (
        <DataListHeader>
          <DataListHead>Source</DataListHead>
          <DataListHead>Visitors</DataListHead>
        </DataListHeader>
      )}
      <DataListBody>
        {data?.map((row) => {
          return (
            <DataListRow
              key={row.source}
              className={
                onSourceClick
                  ? 'group/row cursor-pointer transition-colors hover:bg-accent/50'
                  : 'group/row'
              }
              data-testid={`source-row-${row.isDirectTraffic ? 'direct' : row.source}`}
              onClick={onSourceClick ? () => handleRowClick(row) : undefined}
            >
              <DataListItemContent className="group-hover/datalist:max-w-[calc(100%-140px)]">
                <div className="flex items-center space-x-4 overflow-hidden">
                  <div className="truncate font-medium">
                    {row.linkUrl && !onSourceClick ? (
                      <a
                        className="group/link flex items-center gap-2"
                        href={row.linkUrl}
                        rel="noreferrer"
                        target="_blank"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <SourceIcon
                          defaultSourceIconUrl={defaultSourceIconUrl}
                          displayName={row.displayName}
                          iconSrc={row.iconSrc}
                        />
                        <span className="group-hover/link:underline">{row.displayName}</span>
                      </a>
                    ) : (
                      <span className="flex items-center gap-2">
                        <SourceIcon
                          defaultSourceIconUrl={defaultSourceIconUrl}
                          displayName={row.displayName}
                          iconSrc={row.iconSrc}
                        />
                        <span>{row.displayName}</span>
                      </span>
                    )}
                  </div>
                </div>
              </DataListItemContent>
              {/* EXPLORATION: no bar behind the row; the percentage slides in
                  on hover, as today */}
              <DataListItemValue>
                <DataListItemValueAbs>{formatNumber(row.visits)}</DataListItemValueAbs>
                <DataListItemValuePerc>
                  {formatPercentage(row.percentage || 0)}
                </DataListItemValuePerc>
              </DataListItemValue>
            </DataListRow>
          );
        })}
      </DataListBody>
    </DataList>
  );
};

interface SourcesCardProps {
  data: BaseSourceData[] | null;
  range?: number;
  totalVisitors?: number;
  siteUrl?: string;
  siteIcon?: string;
  defaultSourceIconUrl?: string;
  isLoading: boolean;
  onSourceClick?: (source: string) => void;
  // EXPLORATION: rows shown in the list (6 by default); the sheet has them all
  limit?: number;
}

export const SourcesCard: React.FC<SourcesCardProps> = ({
  data,
  range = 30,
  totalVisitors = 0,
  siteUrl,
  siteIcon,
  defaultSourceIconUrl = DEFAULT_SOURCE_ICON_URL,
  isLoading,
  onSourceClick,
  limit = 6,
}) => {
  // Process and group sources data with pre-computed icons and display values
  const processedData = React.useMemo(() => {
    return processSources({
      data,
      mode: 'visits',
      siteUrl,
      siteIcon,
      defaultSourceIconUrl,
    });
  }, [data, siteUrl, siteIcon, defaultSourceIconUrl]);

  // Extend processed data with percentage values for visits mode
  const extendedData = React.useMemo(() => {
    return extendSourcesWithPercentages({
      processedData,
      totalVisitors,
      mode: 'visits',
    });
  }, [processedData, totalVisitors]);

  const topSources = extendedData.slice(0, limit);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Generate description based on mode and range
  // EXPLORATION: a subtitle under Web traffic's Breakdown
  const title = 'Sources';
  const description = `How readers found your ${range ? 'site' : 'post'} ${getPeriodText(range)}`;

  return (
    <Card className="group/datalist" data-testid="top-sources-card">
      <div className="flex items-center justify-between gap-6 px-6 pt-6 pb-5">
        <CardHeader className="p-0">
          {/* EXPLORATION: "View all" is an arrow after the title */}
          <div className="flex items-center gap-1">
            <CardTitle>{title}</CardTitle>
            {extendedData.length > 0 && <ViewAllButton onClick={() => setSheetOpen(true)} />}
          </div>
        </CardHeader>
        {/* EXPLORATION: "Visitors" in the title row */}
        <VisitorsHeader />
      </div>
      <CardContent className="overflow-hidden">
        {isLoading && !data ? (
          <SkeletonTable className="mt-3" />
        ) : topSources.length > 0 ? (
          <SourcesTable
            data={topSources}
            defaultSourceIconUrl={defaultSourceIconUrl}
            range={range}
            tableHeader={false}
            onSourceClick={onSourceClick}
          />
        ) : (
          <EmptyIndicator className="w-full py-20" title={`No visitors ${getPeriodText(range)}`}>
            <LucideIcon.Globe strokeWidth={1.5} />
          </EmptyIndicator>
        )}
      </CardContent>
      {/* The full list, opened by the arrow after the title */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto pt-0 sm:max-w-[420px]">
          <SheetHeader className="sticky top-0 z-40 -mx-6 bg-surface-elevated/60 p-6 backdrop-blur">
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          <div className="group/datalist">
            <SourcesTable
              data={extendedData}
              defaultSourceIconUrl={defaultSourceIconUrl}
              range={range}
              tableHeader={true}
              onSourceClick={onSourceClick}
            />
          </div>
        </SheetContent>
      </Sheet>
    </Card>
  );
};

export default SourcesCard;
