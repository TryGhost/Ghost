import React, {useState} from 'react';
import SortButton from '../../components/SortButton';
import SourceIcon from '../../components/SourceIcon';
import {Button, EmptyIndicator, LucideIcon, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SkeletonTable, Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow, UtmCampaignType, centsToDollars, formatNumber, getUtmType} from '@tryghost/shade';
import {getFaviconDomain, getSymbol, useAppContext, useNavigate} from '@tryghost/admin-x-framework';
import {getPeriodText} from '@src/utils/chart-helpers';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useMrrHistory, useUtmGrowthStats} from '@tryghost/admin-x-framework/api/stats';
import {useTopSourcesGrowth} from '@src/hooks/useTopSourcesGrowth';

interface ProcessedReferrerData {
    source: string;
    free_members: number;
    paid_members: number;
    mrr: number; // Real MRR from database
    iconSrc: string;
    displayName: string;
    linkUrl?: string;
}

type SourcesOrder = 'free_members desc' | 'paid_members desc' | 'mrr desc' | 'source desc';

interface GrowthSourcesTableProps {
    data: ProcessedReferrerData[];
    currencySymbol: string;
    limit?: number;
    defaultSourceIconUrl: string;
}

const GrowthSourcesTableBody: React.FC<GrowthSourcesTableProps> = ({data, currencySymbol, limit, defaultSourceIconUrl}) => {
    // Data is already sorted by the backend, so we just need to apply limit if specified
    const displayData = limit ? data.slice(0, limit) : data;
    const {appSettings} = useAppContext();

    return (
        <TableBody>
            {displayData.map(row => (
                <TableRow key={row.source} className='last:border-none'>
                    <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                            <SourceIcon
                                defaultSourceIconUrl={defaultSourceIconUrl}
                                displayName={row.displayName}
                                iconSrc={row.iconSrc}
                            />
                            {row.linkUrl ? (
                                <a
                                    className="hover:underline"
                                    href={row.linkUrl}
                                    rel="noreferrer"
                                    target="_blank"
                                >
                                    {row.displayName}
                                </a>
                            ) : (
                                <span>{row.displayName}</span>
                            )}
                        </div>
                    </TableCell>
                    <TableCell className='text-right font-mono text-sm'>
                            +{formatNumber(row.free_members)}
                    </TableCell>
                    {appSettings?.paidMembersEnabled &&
                    <>
                        <TableCell className='text-right font-mono text-sm'>
                            +{formatNumber(row.paid_members)}
                        </TableCell>
                        <TableCell className='text-right font-mono text-sm'>
                            +{currencySymbol}{centsToDollars(row.mrr)}
                        </TableCell>
                    </>
                    }
                </TableRow>
            ))}
        </TableBody>
    );
};

interface GrowthSourcesProps {
    range: number;
    limit?: number;
    showViewAll?: boolean;
    sortBy?: SourcesOrder;
    setSortBy?: (sortBy: SourcesOrder) => void;
    selectedCampaign?: UtmCampaignType;
}

export const GrowthSources: React.FC<GrowthSourcesProps> = ({
    range,
    limit = 20,
    showViewAll = false,
    sortBy: externalSortBy,
    setSortBy: externalSetSortBy,
    selectedCampaign = ''
}) => {
    const {data: globalData} = useGlobalData();
    const {data: mrrHistoryResponse} = useMrrHistory();
    const {appSettings} = useAppContext();
    const navigate = useNavigate();

    // Use external sort state if provided, otherwise use internal state
    const [internalSortBy, setInternalSortBy] = useState<SourcesOrder>('free_members desc');
    const sortBy = externalSortBy || internalSortBy;
    const setSortBy = externalSetSortBy || setInternalSortBy;

    // Convert our sort format to backend format
    const backendOrderBy = sortBy.replace('free_members', 'signups').replace('paid_members', 'paid_conversions');

    // When showViewAll is true, fetch more data to detect if there are more results than the preview limit
    // This allows us to show the "View all" footer when processedData.length > limit
    const fetchLimit = showViewAll ? 100 : limit;

    // Use the new endpoint with server-side sorting and limiting for regular sources
    const {data: referrersData, isLoading: isSourcesLoading} = useTopSourcesGrowth(range, backendOrderBy, fetchLimit);

    // Get UTM campaign data when a campaign is selected
    const utmType = getUtmType(selectedCampaign);
    const {data: utmData, isFetching: isUtmFetching} = useUtmGrowthStats({
        searchParams: {
            utm_type: utmType,
            limit: String(fetchLimit),
            order: backendOrderBy
        },
        enabled: !!selectedCampaign
    });

    // Get site URL for favicon processing
    const siteUrl = globalData?.url as string | undefined;
    const defaultSourceIconUrl = 'https://www.google.com/s2/favicons?domain=ghost.org&sz=64';

    // Get currency symbol from MRR history (same logic as Posts app)
    const currencySymbol = React.useMemo(() => {
        if (mrrHistoryResponse?.stats && mrrHistoryResponse?.meta?.totals) {
            const mrrTotals = mrrHistoryResponse.meta.totals;
            let currentMax = mrrTotals[0];
            if (!currentMax) {
                return getSymbol('usd');
            }

            for (const total of mrrTotals) {
                if (total.mrr > currentMax.mrr) {
                    currentMax = total;
                }
            }

            return getSymbol(currentMax.currency);
        }
        return getSymbol('usd');
    }, [mrrHistoryResponse]);

    // Process data for display (no client-side sorting needed since backend handles it)
    const processedData = React.useMemo((): ProcessedReferrerData[] => {
        // If a campaign is selected, only show UTM data (not regular sources)
        if (selectedCampaign) {
            // If we have UTM data and we're not fetching, show it
            if (utmData?.stats && !isUtmFetching) {
                // UTM values are campaign identifiers, not domains - don't show icons or links
                return utmData.stats.map((item) => {
                    const source = item.utm_value || '(not set)';
                    return {
                        source,
                        free_members: item.free_members,
                        paid_members: item.paid_members,
                        mrr: item.mrr,
                        iconSrc: '',
                        displayName: source,
                        linkUrl: undefined
                    };
                });
            }
            // If fetching or no data yet, return empty array (don't show regular sources)
            return [];
        }

        // Default to regular sources data when no campaign is selected
        if (!referrersData?.stats) {
            return [];
        }

        // Map the backend data to our display format
        // Backend already returns normalized source names, so no need for client-side normalization
        return referrersData.stats.map((item) => {
            const source = item.source || 'Direct'; // Backend should handle this, but fallback just in case
            const {domain: faviconDomain} = getFaviconDomain(source, siteUrl);
            const iconSrc = faviconDomain
                ? `https://www.faviconextractor.com/favicon/${faviconDomain}?larger=true`
                : defaultSourceIconUrl;
            // Don't link Direct sources since they represent direct traffic to the site
            const linkUrl = (faviconDomain && source !== 'Direct') ? `https://${faviconDomain}` : undefined;

            return {
                source,
                free_members: item.signups,
                paid_members: item.paid_conversions,
                mrr: item.mrr,
                iconSrc,
                displayName: source,
                linkUrl
            };
        });
    }, [referrersData, utmData, selectedCampaign, siteUrl, defaultSourceIconUrl, isUtmFetching]);

    const title = 'Top sources';
    const description = `Where did your growth come from ${getPeriodText(range)}`;

    // Return disabled state immediately if member source tracking is disabled
    if (!appSettings?.analytics.membersTrackSources) {
        return (
            <TableBody>
                <TableRow className='last:border-none'>
                    <TableCell className='border-none py-12 group-hover:!bg-transparent' colSpan={appSettings?.paidMembersEnabled ? 4 : 2}>
                        <EmptyIndicator
                            actions={
                                <Button variant='outline' onClick={() => navigate('/settings/analytics', {crossApp: true})}>
                                    Open settings
                                </Button>
                            }
                            description='Enable member source tracking in settings to see which content drives member growth.'
                            title='Member sources have been disabled'
                        >
                            <LucideIcon.Activity />
                        </EmptyIndicator>
                    </TableCell>
                </TableRow>
            </TableBody>
        );
    }

    // Show loading state when:
    // 1. Loading regular sources data and not showing campaigns
    // 2. Fetching UTM data and showing a campaign
    const isLoading = (!selectedCampaign && isSourcesLoading && !referrersData) || (!!selectedCampaign && isUtmFetching);

    if (isLoading) {
        return (
            <TableBody>
                <TableRow className='last:border-none'>
                    <TableCell className='border-none py-12 group-hover:!bg-transparent' colSpan={appSettings?.paidMembersEnabled ? 4 : 2}>
                        <SkeletonTable lines={5} />
                    </TableCell>
                </TableRow>
            </TableBody>
        );
    }

    return (
        <>
            {processedData.length > 0 ? (
                <GrowthSourcesTableBody
                    currencySymbol={currencySymbol}
                    data={processedData}
                    defaultSourceIconUrl={defaultSourceIconUrl}
                    limit={limit}
                />
            ) : (
                <TableBody>
                    <TableRow className='last:border-none'>
                        <TableCell className='border-none py-12 group-hover:!bg-transparent' colSpan={appSettings?.paidMembersEnabled ? 4 : 2}>
                            <EmptyIndicator
                                description='Try adjusting your date range to see more data.'
                                title={`No conversions ${getPeriodText(range)}`}
                            >
                                <LucideIcon.FileText strokeWidth={1.5} />
                            </EmptyIndicator>
                        </TableCell>
                    </TableRow>
                </TableBody>
            )}
            {showViewAll && processedData.length > limit &&
                <TableFooter className='border-none bg-transparent hover:!bg-transparent'>
                    <TableRow>
                        <TableCell className='border-none bg-transparent px-0 pb-0 hover:!bg-transparent' colSpan={4}>
                            <Sheet>
                                <SheetTrigger asChild>
                                    <Button variant='outline'>View all <LucideIcon.TableOfContents /></Button>
                                </SheetTrigger>
                                <SheetContent className='overflow-y-auto pt-0 sm:max-w-[600px]'>
                                    <SheetHeader className='sticky top-0 z-40 -mx-6 bg-background/60 p-6 backdrop-blur'>
                                        <SheetTitle>{title}</SheetTitle>
                                        <SheetDescription>{description}</SheetDescription>
                                    </SheetHeader>
                                    <div className='group/datalist'>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>
                                                        Source
                                                    </TableHead>
                                                    <TableHead className='w-[110px] text-right'>
                                                        <SortButton activeSortBy={sortBy} setSortBy={setSortBy} sortBy='free_members desc'>
                                                        Free members
                                                        </SortButton>
                                                    </TableHead>
                                                    {appSettings?.paidMembersEnabled &&
                                                    <>
                                                        <TableHead className='w-[110px] text-right'>
                                                            <SortButton activeSortBy={sortBy} setSortBy={setSortBy} sortBy='paid_members desc'>
                                                            Paid members
                                                            </SortButton>
                                                        </TableHead>
                                                        <TableHead className='w-[110px] text-right'>
                                                            <SortButton activeSortBy={sortBy} setSortBy={setSortBy} sortBy='mrr desc'>
                                                            MRR impact
                                                            </SortButton>
                                                        </TableHead>
                                                    </>
                                                    }
                                                </TableRow>
                                            </TableHeader>
                                            <GrowthSourcesTableBody
                                                currencySymbol={currencySymbol}
                                                data={processedData}
                                                defaultSourceIconUrl={defaultSourceIconUrl}
                                            />
                                        </Table>
                                    </div>
                                </SheetContent>
                            </Sheet>
                        </TableCell>
                    </TableRow>
                </TableFooter>
            }
        </>
    );
};

export default GrowthSources;
