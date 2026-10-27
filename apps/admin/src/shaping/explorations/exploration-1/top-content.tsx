import {
  Button,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  EmptyIndicator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SkeletonTable,
} from '@tryghost/shade/components';
import {
  CONTENT_TYPES,
  type ContentType,
  getContentDescription,
  getContentTitle,
} from '@/analytics/utils/content-helpers';
import { LucideIcon, formatNumber, formatPercentage } from '@tryghost/shade/utils';
import { getAudienceQueryParam } from '@/shared/analytics/audience';
import { getClickHandler } from '@/analytics/utils/url-helpers';
import { formatQueryDate, getPeriodText, getRangeDates } from '@/shared/analytics/chart-helpers';
import { useAnalyticsData } from '@/shared/analytics/use-analytics-data';
import { useMemo, useState } from 'react';
import { useNavigate } from '@tryghost/admin-x-framework';
import { useTopContent } from '@tryghost/admin-x-framework/api/stats';
import { ViewAllButton, VisitorsHeader } from './visitors-header';

// EXPLORATION ONLY — never merge (see src/shaping/README.md).
//
// Exploration 1's Top content: a copy of
// analytics/views/stats/web/components/top-content.tsx with no description,
// no column header row: the number column's label ("Visitors") sits at the
// right of the title row, as in Top sources beside it. The Posts & pages
// filter is a chevron menu after the title, which names what's picked; each
// row leads with a post or page icon. "View all" is a plain text link at
// the bottom left (visitors-header.tsx).

// Unified data structure for content
interface UnifiedContentData {
  pathname: string;
  title: string;
  visits: number;
  percentage?: number;
  post_uuid?: string;
  post_id?: string;
  post_type?: string;
  url_exists?: boolean;
}

interface TopContentTableProps {
  data: UnifiedContentData[] | null;
  range: number;
  contentType: ContentType;
  tableHeader: boolean;
  // EXPLORATION: titles wrap to two lines before cutting off (long post
  // titles), instead of one
  wrapTitles?: boolean;
}

const TopContentTable: React.FC<TopContentTableProps> = ({
  tableHeader = false,
  data,
  contentType,
  wrapTitles = false,
}) => {
  const navigate = useNavigate();
  const { site } = useAnalyticsData();

  const getTableHeader = () => {
    switch (contentType) {
      case CONTENT_TYPES.POSTS:
        return 'Posts';
      case CONTENT_TYPES.PAGES:
        return 'Pages';
      default:
        return 'Posts & pages';
    }
  };

  return (
    <DataList>
      {tableHeader && (
        <DataListHeader>
          <DataListHead>{getTableHeader()}</DataListHead>
          <DataListHead>Visitors</DataListHead>
        </DataListHeader>
      )}
      <DataListBody>
        {data?.map((row: UnifiedContentData) => {
          // Only make posts clickable (not pages), since there's no analytics route for pages
          const isClickable = row.post_id && row.post_type === 'post';
          const clickHandler = isClickable
            ? getClickHandler(row.pathname, row.post_id, site.url || '', navigate, row.post_type)
            : () => {};

          return (
            <DataListRow
              key={row.pathname}
              className={`group/row ${isClickable && 'hover:cursor-pointer'}`}
              onClick={clickHandler}
            >
              <DataListItemContent className="group-hover/datalist:max-w-[calc(100%-140px)]">
                <div className="flex items-center space-x-2 overflow-hidden">
                  {/* EXPLORATION: each row's type, with the left nav's icons
                      (Posts: PenLine, Pages: File), and a house for the
                      homepage. Anything else keeps an empty slot so the
                      titles line up. */}
                  {row.pathname === '/' ? (
                    <LucideIcon.House
                      aria-label="Homepage"
                      className="size-4 shrink-0 text-muted-foreground"
                    />
                  ) : row.post_type === 'post' ? (
                    <LucideIcon.PenLine
                      aria-label="Post"
                      className="size-4 shrink-0 text-muted-foreground"
                    />
                  ) : row.post_type === 'page' ? (
                    <LucideIcon.File
                      aria-label="Page"
                      className="size-4 shrink-0 text-muted-foreground"
                    />
                  ) : (
                    <span className="size-4 shrink-0" />
                  )}
                  <div
                    className={`${wrapTitles ? 'line-clamp-2' : 'truncate'} font-medium ${isClickable ? 'group-hover/row:underline' : ''}`}
                  >
                    {row.title}
                  </div>
                </div>
              </DataListItemContent>
              {/* EXPLORATION: no bar behind the row; the percentage slides in
                  on hover, as today */}
              <DataListItemValue>
                <DataListItemValueAbs>{formatNumber(Number(row.visits))}</DataListItemValueAbs>
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

interface TopContentProps {
  range: number;
  totalVisitors: number;
  audience: number;
  filterParams?: Record<string, string>;
  // EXPLORATION: one fixed content type with its own title (Posts, Pages),
  // in place of the picker
  contentType?: ContentType;
  title?: string;
  // EXPLORATION: rows shown before "View all" (6 by default), and titles
  // wrapping to two lines
  limit?: number;
  wrapTitles?: boolean;
}

const TopContent: React.FC<TopContentProps> = ({
  range,
  totalVisitors,
  audience,
  filterParams = {},
  contentType,
  title,
  limit = 6,
  wrapTitles = false,
}) => {
  const { startDate, endDate, timezone } = getRangeDates(range);
  const [pickedContentType, setSelectedContentType] = useState<ContentType>(
    CONTENT_TYPES.POSTS_AND_PAGES,
  );
  const selectedContentType = contentType ?? pickedContentType;

  // Prepare query parameters based on selected content type
  const queryParams = useMemo(() => {
    const params: Record<string, string> = {
      date_from: formatQueryDate(startDate),
      date_to: formatQueryDate(endDate),
      member_status: getAudienceQueryParam(audience),
      ...filterParams,
    };

    if (timezone) {
      params.timezone = timezone;
    }

    // Add post_type filter based on selected content type
    if (selectedContentType === CONTENT_TYPES.POSTS) {
      params.post_type = 'post';
    } else if (selectedContentType === CONTENT_TYPES.PAGES) {
      params.post_type = 'page';
    }
    // For POSTS_AND_PAGES, don't add post_type filter to get both

    return params;
  }, [startDate, endDate, timezone, audience, selectedContentType, filterParams]);

  // Get filtered content data
  const { data: topContentData, isLoading: isLoading } = useTopContent({
    searchParams: queryParams,
  });

  // Transform data for display
  const transformedData = useMemo((): UnifiedContentData[] | null => {
    const data = topContentData?.stats || null;
    if (!data) {
      return null;
    }

    return data.map((item) => ({
      pathname: item.pathname,
      title: item.title || item.pathname,
      visits: item.visits,
      percentage: totalVisitors > 0 ? Number(item.visits) / totalVisitors : 0,
      post_uuid: item.post_uuid,
      post_id: item.post_id,
      post_type: item.post_type,
      url_exists: item.url_exists,
    }));
  }, [topContentData, totalVisitors]);

  const topContent = transformedData?.slice(0, limit) || [];
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <Card className="group/datalist" data-testid="top-content-card">
      <div className="flex items-center justify-between gap-6 px-6 pt-6 pb-5">
        <CardHeader className="p-0">
          {/* EXPLORATION: the content filter is a chevron after the title,
              and the title follows it (Top content, Top posts, Top pages) */}
          {contentType ? (
            // EXPLORATION: "View all" is an arrow after the title
            <div className="flex items-center gap-1">
              <CardTitle>{title ?? getContentTitle(contentType)}</CardTitle>
              {transformedData && transformedData.length > 0 && (
                <ViewAllButton onClick={() => setSheetOpen(true)} />
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <CardTitle>{getContentTitle(selectedContentType)}</CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    aria-label="Choose content type"
                    className="text-muted-foreground [&_svg]:size-4"
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <LucideIcon.ChevronDown />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuRadioGroup
                    value={selectedContentType}
                    onValueChange={(value) => setSelectedContentType(value as ContentType)}
                  >
                    <DropdownMenuRadioItem value={CONTENT_TYPES.POSTS_AND_PAGES}>
                      Posts & pages
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value={CONTENT_TYPES.POSTS}>Posts</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value={CONTENT_TYPES.PAGES}>Pages</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              {transformedData && transformedData.length > 0 && (
                <ViewAllButton onClick={() => setSheetOpen(true)} />
              )}
            </div>
          )}
        </CardHeader>
        {/* EXPLORATION: "Visitors" in the title row */}
        <VisitorsHeader />
      </div>
      <CardContent className="overflow-hidden">
        {isLoading ? (
          <SkeletonTable className="mt-3" />
        ) : topContent.length > 0 ? (
          <TopContentTable
            contentType={selectedContentType}
            data={topContent}
            range={range}
            tableHeader={false}
            wrapTitles={wrapTitles}
          />
        ) : (
          <EmptyIndicator className="w-full py-20" title={`No visitors ${getPeriodText(range)}`}>
            <LucideIcon.FileText strokeWidth={1.5} />
          </EmptyIndicator>
        )}
      </CardContent>
      {/* The full list, opened by the arrow after the title */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto pt-0 sm:max-w-[420px]">
          <SheetHeader className="sticky top-0 z-40 -mx-6 bg-surface-elevated/60 p-6 backdrop-blur">
            <SheetTitle>{title ?? getContentTitle(selectedContentType)}</SheetTitle>
            <SheetDescription>
              {getContentDescription(selectedContentType, range, getPeriodText)}
            </SheetDescription>
          </SheetHeader>
          <div className="group/datalist">
            <TopContentTable
              contentType={selectedContentType}
              data={transformedData}
              range={range}
              tableHeader={true}
              wrapTitles={wrapTitles}
            />
          </div>
        </SheetContent>
      </Sheet>
    </Card>
  );
};

export default TopContent;
