import {Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, DataList, DataListBar, DataListBody, DataListHead, DataListHeader, DataListItemContent, DataListItemValue, DataListItemValueAbs, DataListItemValuePerc, DataListRow, EmptyIndicator, HTable, LucideIcon, Separator, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SkeletonTable, Tabs, TabsList, TabsTrigger, formatNumber, formatPercentage, formatQueryDate, getRangeDates} from '@tryghost/shade';
import {CONTENT_TYPES, ContentType, getContentDescription, getContentTitle} from '@src/utils/content-helpers';
import {getAudienceQueryParam} from '../../components/AudienceSelect';
import {getClickHandler} from '@src/utils/url-helpers';
import {getPeriodText} from '@src/utils/chart-helpers';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useMemo, useState} from 'react';
import {useNavigate} from '@tryghost/admin-x-framework';
import {useTopContent} from '@tryghost/admin-x-framework/api/stats';

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

const TopContentTable: React.FC<TopContentTableProps> = ({tableHeader = false, data, contentType}) => {
    const navigate = useNavigate();
    const {site} = useGlobalData();

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
            {tableHeader &&
                <DataListHeader>
                    <DataListHead>{getTableHeader()}</DataListHead>
                    <DataListHead>Visitors</DataListHead>
                </DataListHeader>
            }
            <DataListBody>
                {data?.map((row: UnifiedContentData) => {
                    // Only make posts clickable (not pages), since there's no analytics route for pages
                    const isClickable = row.post_id && row.post_type === 'post';
                    const clickHandler = isClickable ? getClickHandler(row.pathname, row.post_id, site.url || '', navigate, row.post_type) : () => {};

                    return (
                        <DataListRow
                            key={row.pathname}
                            className={`group/row ${isClickable && 'hover:cursor-pointer'}`}
                            onClick={clickHandler}
                        >
                            <DataListBar style={{
                                width: `${row.percentage ? Math.round(row.percentage * 100) : 0}%`
                            }} />
                            <DataListItemContent className='group-hover/datalist:max-w-[calc(100%-140px)]'>
                                <div className='flex items-center space-x-2 overflow-hidden'>
                                    <div className={`truncate font-medium ${isClickable ? 'group-hover/row:underline' : ''}`}>
                                        {row.title}
                                    </div>
                                </div>
                            </DataListItemContent>
                            <DataListItemValue>
                                <DataListItemValueAbs>{formatNumber(Number(row.visits))}</DataListItemValueAbs>
                                <DataListItemValuePerc>{formatPercentage(row.percentage || 0)}</DataListItemValuePerc>
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
}

const TopContent: React.FC<TopContentProps> = ({range, totalVisitors}) => {
    const {audience} = useGlobalData();
    const {startDate, endDate, timezone} = getRangeDates(range);
    const [selectedContentType, setSelectedContentType] = useState<ContentType>(CONTENT_TYPES.POSTS_AND_PAGES);

    // Prepare query parameters based on selected content type
    const queryParams = useMemo(() => {
        const params: Record<string, string> = {
            date_from: formatQueryDate(startDate),
            date_to: formatQueryDate(endDate),
            member_status: getAudienceQueryParam(audience)
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
    }, [startDate, endDate, timezone, audience, selectedContentType]);

    // Get filtered content data
    const {data: topContentData, isLoading: isLoading} = useTopContent({
        searchParams: queryParams
    });

    // Transform data for display
    const transformedData = useMemo((): UnifiedContentData[] | null => {
        const data = topContentData?.stats || null;
        if (!data) {
            return null;
        }

        return data.map(item => ({
            pathname: item.pathname,
            title: item.title || item.pathname,
            visits: item.visits,
            percentage: totalVisitors > 0 ? (Number(item.visits) / totalVisitors) : 0,
            post_uuid: item.post_uuid,
            post_id: item.post_id,
            post_type: item.post_type,
            url_exists: item.url_exists
        }));
    }, [topContentData, totalVisitors]);

    const topContent = transformedData?.slice(0, 10) || [];

    return (
        <Card className='group/datalist' data-testid='top-content-card'>
            <div className='flex items-center justify-between gap-6 p-6'>
                <CardHeader className='p-0'>
                    <CardTitle>{getContentTitle(selectedContentType)}</CardTitle>
                    <CardDescription>{getContentDescription(selectedContentType, range, getPeriodText)}</CardDescription>
                </CardHeader>
                <HTable className='mr-2'>Visitors</HTable>
            </div>
            <CardContent className='overflow-hidden'>
                <div className='mb-2'>
                    <Tabs defaultValue={selectedContentType} variant='button-sm' onValueChange={(value: string) => {
                        setSelectedContentType(value as ContentType);
                    }}>
                        <TabsList>
                            <TabsTrigger value={CONTENT_TYPES.POSTS_AND_PAGES}>Posts & pages</TabsTrigger>
                            <TabsTrigger value={CONTENT_TYPES.POSTS}>Posts</TabsTrigger>
                            <TabsTrigger value={CONTENT_TYPES.PAGES}>Pages</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
                <Separator />
                {isLoading ?
                    <SkeletonTable className='mt-3' />
                    :
                    topContent.length > 0 ?
                        <TopContentTable
                            contentType={selectedContentType}
                            data={topContent}
                            range={range}
                            tableHeader={false}
                        />
                        :
                        <EmptyIndicator
                            className='w-full py-20'
                            title={`No visitors ${getPeriodText(range)}`}
                        >
                            <LucideIcon.FileText strokeWidth={1.5} />
                        </EmptyIndicator>
                }
            </CardContent>

            {transformedData && transformedData.length > 10 &&
            <CardFooter>
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant='outline'>View all <LucideIcon.TableOfContents /></Button>
                    </SheetTrigger>
                    <SheetContent className='overflow-y-auto pt-0 sm:max-w-[600px]'>
                        <SheetHeader className='sticky top-0 z-40 -mx-6 bg-background/60 p-6 backdrop-blur'>
                            <SheetTitle>Top content</SheetTitle>
                            <SheetDescription>{getContentDescription(selectedContentType, range, getPeriodText)}</SheetDescription>
                        </SheetHeader>
                        <div className='group/datalist'>
                            <TopContentTable
                                contentType={selectedContentType}
                                data={transformedData}
                                range={range}
                                tableHeader={true}
                            />
                        </div>
                    </SheetContent>
                </Sheet>
            </CardFooter>
            }
        </Card>
    );
};

export default TopContent;
