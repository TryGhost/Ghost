import {Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, DataList, DataListBar, DataListBody, DataListHead, DataListHeader, DataListItemContent, DataListItemValue, DataListItemValueAbs, DataListItemValuePerc, DataListRow, HTable, LucideIcon, Separator, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SkeletonTable, Tabs, TabsList, TabsTrigger, formatNumber, formatPercentage, formatQueryDate, getRangeDates} from '@tryghost/shade';
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

interface TopContentProps {
    range: number;
}

const TopContent: React.FC<TopContentProps> = ({range}) => {
    const {audience, site} = useGlobalData();
    const navigate = useNavigate();
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
            post_type: item.post_type,
            url_exists: item.url_exists
        }));
    }, [topContentData]);

    const topContent = transformedData?.slice(0, 10) || [];

    return (
        <Card className='group/datalist'>
            <div className='flex items-center justify-between p-6'>
                <CardHeader className='p-0'>
                    <CardTitle>{getContentTitle(selectedContentType)}</CardTitle>
                    <CardDescription>{getContentDescription(selectedContentType, range, getPeriodText)}</CardDescription>
                </CardHeader>
                <HTable className='mr-2'>Visitors</HTable>
            </div>
            <CardContent className='overflow-hidden'>
                <div className='mb-4'>
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
                {isLoading ? (
                    <SkeletonTable lines={5} />
                ) : (
                    <>
                        {topContent.length > 0 ? (
                            <DataList>
                                <DataListBody>
                                    {topContent.map((row: UnifiedContentData) => (
                                        <DataListRow key={row.pathname} className='group/row'>
                                            <DataListBar style={{
                                                width: `${Math.round((row.percentage || 0) * 100)}%`
                                            }} />
                                            <DataListItemContent className='group-hover/datalist:max-w-[calc(100%-140px)]'>
                                                <div className='flex items-center space-x-4 overflow-hidden'>
                                                    <div className='truncate font-medium'>
                                                        {row.post_id && row.post_type === 'post' ?
                                                            <Button
                                                                className='h-auto whitespace-normal p-0 text-left font-medium leading-tight hover:!underline'
                                                                title='View post analytics'
                                                                variant='link'
                                                                onClick={getClickHandler(row.pathname, row.post_id, site.url || '', navigate, row.post_type)}
                                                            >
                                                                {row.title}
                                                            </Button>
                                                            :
                                                            <span className='font-medium'>
                                                                {row.title}
                                                            </span>
                                                        }
                                                    </div>
                                                </div>
                                            </DataListItemContent>
                                            <DataListItemValue>
                                                <DataListItemValueAbs>{formatNumber(Number(row.visits))}</DataListItemValueAbs>
                                                <DataListItemValuePerc>{formatPercentage(row.percentage || 0)}</DataListItemValuePerc>
                                            </DataListItemValue>
                                        </DataListRow>
                                    ))}
                                </DataListBody>
                            </DataList>
                        ) : (
                            <div className='flex flex-col items-center justify-center space-y-3 py-12 text-center'>
                                <div className='flex size-12 items-center justify-center rounded-full bg-muted'>
                                    <svg className='size-6 text-muted-foreground' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                        <path d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} />
                                    </svg>
                                </div>
                                <div className='text-sm text-muted-foreground'>No content found</div>
                            </div>
                        )}
                    </>
                )}
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
                                <SheetDescription>{getContentDescription(selectedContentType, range, getPeriodText)}</SheetDescription>
                            </SheetHeader>
                            <div className='group/datalist'>
                                <DataList>
                                    <DataListHeader>
                                        <DataListHead>
                                            {selectedContentType === CONTENT_TYPES.POSTS ? 'Post' : selectedContentType === CONTENT_TYPES.PAGES ? 'Page' : 'Content'}
                                        </DataListHead>
                                        <DataListHead>Visitors</DataListHead>
                                    </DataListHeader>
                                    <DataListBody>
                                        {transformedData.map((row: UnifiedContentData) => (
                                            <DataListRow key={row.pathname} className='group/row'>
                                                <DataListBar style={{
                                                    width: `${Math.round((row.percentage || 0) * 100)}%`
                                                }} />
                                                <DataListItemContent className='group-hover/datalist:max-w-[calc(100%-140px)]'>
                                                    <div className='flex items-center space-x-4 overflow-hidden'>
                                                        <div className='truncate font-medium'>
                                                            {row.post_id && row.post_type === 'post' ?
                                                                <Button
                                                                    className='h-auto whitespace-normal p-0 text-left font-medium leading-tight hover:!underline'
                                                                    title='View post analytics'
                                                                    variant='link'
                                                                    onClick={getClickHandler(row.pathname, row.post_id, site.url || '', navigate, row.post_type)}
                                                                >
                                                                    {row.title}
                                                                </Button>
                                                                :
                                                                <span className='font-medium'>
                                                                    {row.title}
                                                                </span>
                                                            }
                                                        </div>
                                                    </div>
                                                </DataListItemContent>
                                                <DataListItemValue>
                                                    <DataListItemValueAbs>{formatNumber(Number(row.visits))}</DataListItemValueAbs>
                                                    <DataListItemValuePerc>{formatPercentage(row.percentage || 0)}</DataListItemValuePerc>
                                                </DataListItemValue>
                                            </DataListRow>
                                        ))}
                                    </DataListBody>
                                </DataList>
                            </div>
                        </SheetContent>
                    </Sheet>
                </CardFooter>
            }
        </Card>
    );
};

export default TopContent;
