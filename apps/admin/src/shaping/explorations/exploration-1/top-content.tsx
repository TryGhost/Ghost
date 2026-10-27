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
  SheetTrigger,
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
import { ViewAllLink, VisitorsHeader } from './visitors-header';

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
}

const TopContentTable: React.FC<TopContentTableProps> = ({
  tableHeader = false,
  data,
  contentType,
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
              <DataListItemContent className="max-w-[calc(100%-140px)]">
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
                    className={`truncate font-medium ${isClickable ? 'group-hover/row:underline' : ''}`}
                  >
                    {row.title}
                  </div>
                </div>
              </DataListItemContent>
              {/* EXPLORATION: no bar behind the row, and the percentage always
                  shown after the number (not slid in on hover), in a fixed
                  width so the numbers line up */}
              <div className="z-10 flex items-center">
                <DataListItemValueAbs>{formatNumber(Number(row.visits))}</DataListItemValueAbs>
                <DataListItemValuePerc className="w-12 pr-0 text-right">
                  {formatPercentage(row.percentage || 0)}
                </DataListItemValuePerc>
              </div>
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
}

const TopContent: React.FC<TopContentProps> = ({
  range,
  totalVisitors,
  audience,
  filterParams = {},
}) => {
  const { startDate, endDate, timezone } = getRangeDates(range);
  const [selectedContentType, setSelectedContentType] = useState<ContentType>(
    CONTENT_TYPES.POSTS_AND_PAGES,
  );

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

  const topContent = transformedData?.slice(0, 6) || [];

  return (
    <Card className="group/datalist" data-testid="top-content-card">
      <div className="flex items-center justify-between gap-6 px-6 pt-6 pb-5">
        <CardHeader className="p-0">
          {/* EXPLORATION: the content filter is a chevron after the title,
              and the title follows it (Top content, Top posts, Top pages) */}
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
          </div>
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
          />
        ) : (
          <EmptyIndicator className="w-full py-20" title={`No visitors ${getPeriodText(range)}`}>
            <LucideIcon.FileText strokeWidth={1.5} />
          </EmptyIndicator>
        )}
      </CardContent>
      {/* EXPLORATION: "View all" as a text link at the bottom left */}
      {transformedData && transformedData.length > 6 && (
        <div className="pt-3">
          <Sheet>
            <SheetTrigger asChild>
              <ViewAllLink />
            </SheetTrigger>
            <SheetContent className="overflow-y-auto pt-0 sm:max-w-[420px]">
              <SheetHeader className="sticky top-0 z-40 -mx-6 bg-surface-elevated/60 p-6 backdrop-blur">
                <SheetTitle>{getContentTitle(selectedContentType)}</SheetTitle>
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
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}
    </Card>
  );
};

export default TopContent;
