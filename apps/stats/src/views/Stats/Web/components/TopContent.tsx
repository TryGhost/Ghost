import {Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, DataList, DataListBar, DataListBody, DataListHead, DataListHeader, DataListItemContent, DataListItemValue, DataListItemValueAbs, DataListItemValuePerc, DataListRow, HTable, LucideIcon, Separator, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SkeletonTable, Tabs, TabsList, TabsTrigger, formatNumber, formatPercentage, formatQueryDate, getRangeDates} from '@tryghost/shade';
import {getAudienceQueryParam} from '../../components/AudienceSelect';
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
}

// Content type definitions
const CONTENT_TYPES = {
    POSTS: 'posts',
    PAGES: 'pages',
    POSTS_AND_PAGES: 'posts-and-pages'
} as const;

type ContentType = typeof CONTENT_TYPES[keyof typeof CONTENT_TYPES];

interface TopContentTableProps {
    data: UnifiedContentData[] | null;
    range: number;
    contentType: ContentType;
    tableHeader: boolean;
}

const TopContentTable: React.FC<TopContentTableProps> = ({tableHeader = false, data, contentType}) => {
    const navigate = useNavigate();

    const getTableHeader = () => {
        switch (contentType) {
        case CONTENT_TYPES.POSTS:
            return 'Post';
        case CONTENT_TYPES.PAGES:
            return 'Page';
        default:
            return 'Post';
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
                    const handleClick = () => {
                        if (isClickable) {
                            navigate(`/posts/analytics/beta/${row.post_id}`, {crossApp: true});
                        }
                    };

                    return (
                        <DataListRow
                            key={row.pathname}
                            className={`group/row ${isClickable && 'hover:cursor-pointer'}`}
                            onClick={handleClick}
                        >
                            <DataListBar style={{
                                width: `${row.percentage ? Math.round(row.percentage * 100) : 0}%`
                            }} />
                            <DataListItemContent className='group-hover/datalist:max-w-[calc(100%-140px)]'>
                                <div className='flex items-center space-x-4 overflow-hidden'>
                                    <div className={`truncate font-medium ${isClickable && 'group-hover/row:underline'}`}>
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
}

const TopContent: React.FC<TopContentProps> = ({range}) => {
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

        // Calculate total visits for the filtered dataset
        const filteredTotalVisits = data.reduce((sum, item) => sum + Number(item.visits), 0);

        return data.map(item => ({
            pathname: item.pathname,
            title: item.title || item.pathname,
            visits: item.visits,
            percentage: filteredTotalVisits > 0 ? (Number(item.visits) / filteredTotalVisits) : 0,
            post_uuid: item.post_uuid,
            post_id: item.post_id,
            post_type: item.post_type
        }));
    }, [topContentData]);

    const topContent = transformedData?.slice(0, 10) || [];

    const getContentTitle = () => {
        switch (selectedContentType) {
        case CONTENT_TYPES.POSTS:
            return 'Top posts';
        case CONTENT_TYPES.PAGES:
            return 'Top pages';
        default:
            return 'Top content';
        }
    };

    const getContentDescription = () => {
        switch (selectedContentType) {
        case CONTENT_TYPES.POSTS:
            return `Your highest viewed posts ${getPeriodText(range)}`;
        case CONTENT_TYPES.PAGES:
            return `Your highest viewed pages ${getPeriodText(range)}`;
        default:
            return `Your highest viewed posts or pages ${getPeriodText(range)}`;
        }
    };

    return (
        <Card className='group/datalist'>
            <CardHeader>
                <CardTitle>{getContentTitle()}</CardTitle>
                <CardDescription>{getContentDescription()}</CardDescription>
            </CardHeader>
            <div className='flex items-center justify-between px-6 pb-2 pt-0'>
                <Tabs defaultValue={selectedContentType} variant='button-sm' onValueChange={(value: string) => {
                    setSelectedContentType(value as ContentType);
                }}>
                    <TabsList>
                        <TabsTrigger value={CONTENT_TYPES.POSTS_AND_PAGES}>Posts & pages</TabsTrigger>
                        <TabsTrigger value={CONTENT_TYPES.POSTS}>Posts</TabsTrigger>
                        <TabsTrigger value={CONTENT_TYPES.PAGES}>Pages</TabsTrigger>
                    </TabsList>
                </Tabs>
                <HTable className='mr-2'>Visitors</HTable>
            </div>
            <CardContent className='overflow-hidden'>
                <Separator />
                {isLoading ?
                    <SkeletonTable className='mt-3' / >
                    :
                    <TopContentTable
                        contentType={selectedContentType}
                        data={topContent}
                        range={range}
                        tableHeader={false}
                    />
                }
            </CardContent>
            {transformedData && transformedData.length > 10 &&
                <CardFooter>
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant='outline'>View all <LucideIcon.TableOfContents /></Button>
                        </SheetTrigger>
                        <SheetContent className='overflow-y-auto pt-0 sm:max-w-[600px]'>
                            <SheetHeader className='sticky top-0 z-40 -mx-6 bg-white/60 p-6 backdrop-blur'>
                                <SheetTitle>Top content</SheetTitle>
                                <SheetDescription>{getContentDescription()}</SheetDescription>
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