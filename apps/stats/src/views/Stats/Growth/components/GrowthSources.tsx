import React, {useState} from 'react';
import SortButton from '../../components/SortButton';
import {Button, LucideIcon, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SkeletonTable, Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow, centsToDollars, formatNumber} from '@tryghost/shade';
import {getFaviconDomain, getSymbol} from '@tryghost/admin-x-framework';
import {getPeriodText} from '@src/utils/chart-helpers';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useMrrHistory} from '@tryghost/admin-x-framework/api/stats';
import {useReferrersGrowth} from '@src/hooks/useReferrersGrowth';

// Source normalization mapping - same as Posts app
const SOURCE_MAPPING = new Map<string, string>([
    // Social Media Consolidation
    ['facebook', 'Facebook'],
    ['www.facebook.com', 'Facebook'],
    ['l.facebook.com', 'Facebook'],
    ['lm.facebook.com', 'Facebook'],
    ['m.facebook.com', 'Facebook'],
    ['twitter', 'Twitter'],
    ['x.com', 'Twitter'],
    ['com.twitter.android', 'Twitter'],
    ['go.bsky.app', 'Bluesky'],
    ['bsky', 'Bluesky'],
    ['bsky.app', 'Bluesky'],
    ['linkedin', 'LinkedIn'],
    ['www.linkedin.com', 'LinkedIn'],
    ['linkedin.com', 'LinkedIn'],
    ['instagram', 'Instagram'],
    ['www.instagram.com', 'Instagram'],
    ['instagram.com', 'Instagram'],
    ['youtube', 'YouTube'],
    ['www.youtube.com', 'YouTube'],
    ['youtube.com', 'YouTube'],
    ['m.youtube.com', 'YouTube'],
    ['threads', 'Threads'],
    ['www.threads.net', 'Threads'],
    ['threads.net', 'Threads'],
    ['tiktok', 'TikTok'],
    ['www.tiktok.com', 'TikTok'],
    ['tiktok.com', 'TikTok'],
    ['pinterest', 'Pinterest'],
    ['www.pinterest.com', 'Pinterest'],
    ['pinterest.com', 'Pinterest'],
    ['reddit', 'Reddit'],
    ['www.reddit.com', 'Reddit'],
    ['reddit.com', 'Reddit'],
    ['whatsapp', 'WhatsApp'],
    ['whatsapp.com', 'WhatsApp'],
    ['www.whatsapp.com', 'WhatsApp'],
    ['telegram', 'Telegram'],
    ['telegram.org', 'Telegram'],
    ['www.telegram.org', 'Telegram'],
    ['t.me', 'Telegram'],
    ['news.ycombinator.com', 'Hacker News'],
    ['substack', 'Substack'],
    ['substack.com', 'Substack'],
    ['www.substack.com', 'Substack'],
    ['medium', 'Medium'],
    ['medium.com', 'Medium'],
    ['www.medium.com', 'Medium'],

    // Search Engines
    ['google', 'Google'],
    ['www.google.com', 'Google'],
    ['google.com', 'Google'],
    ['bing', 'Bing'],
    ['www.bing.com', 'Bing'],
    ['bing.com', 'Bing'],
    ['yahoo', 'Yahoo'],
    ['www.yahoo.com', 'Yahoo'],
    ['yahoo.com', 'Yahoo'],
    ['search.yahoo.com', 'Yahoo'],
    ['duckduckgo', 'DuckDuckGo'],
    ['duckduckgo.com', 'DuckDuckGo'],
    ['www.duckduckgo.com', 'DuckDuckGo'],
    ['search.brave.com', 'Brave Search'],
    ['yandex', 'Yandex'],
    ['yandex.com', 'Yandex'],
    ['www.yandex.com', 'Yandex'],
    ['baidu', 'Baidu'],
    ['baidu.com', 'Baidu'],
    ['www.baidu.com', 'Baidu'],
    ['ecosia', 'Ecosia'],
    ['www.ecosia.org', 'Ecosia'],
    ['ecosia.org', 'Ecosia'],

    // Email Platforms
    ['gmail', 'Gmail'],
    ['mail.google.com', 'Gmail'],
    ['gmail.com', 'Gmail'],
    ['outlook', 'Outlook'],
    ['outlook.live.com', 'Outlook'],
    ['outlook.com', 'Outlook'],
    ['hotmail.com', 'Outlook'],
    ['mail.yahoo.com', 'Yahoo Mail'],
    ['ymail.com', 'Yahoo Mail'],
    ['icloud.com', 'Apple Mail'],
    ['me.com', 'Apple Mail'],
    ['mac.com', 'Apple Mail'],

    // News Aggregators
    ['news.google.com', 'Google News'],
    ['apple.news', 'Apple News'],
    ['flipboard', 'Flipboard'],
    ['flipboard.com', 'Flipboard'],
    ['www.flipboard.com', 'Flipboard'],
    ['smartnews', 'SmartNews'],
    ['smartnews.com', 'SmartNews'],
    ['www.smartnews.com', 'SmartNews']
]);

const normalizeSource = (source: string): string => {
    if (!source || source === '') {
        return 'Direct';
    }

    // Case-insensitive lookup
    const lowerSource = source.toLowerCase();
    return SOURCE_MAPPING.get(lowerSource) || source;
};

interface ProcessedReferrerData {
    source: string;
    free_members: number;
    paid_members: number;
    mrr: number; // Real MRR from database
    iconSrc: string;
    displayName: string;
    linkUrl?: string;
}

type SourcesOrder = 'free_members desc' | 'paid_members desc' | 'mrr desc' | 'source asc' | 'source desc';

interface GrowthSourcesTableProps {
    data: ProcessedReferrerData[];
    currencySymbol: string;
    limit?: number;
    defaultSourceIconUrl: string;
    sortBy: SourcesOrder;
}

const GrowthSourcesTableBody: React.FC<GrowthSourcesTableProps> = ({data, currencySymbol, limit, defaultSourceIconUrl, sortBy}) => {
    const sortedData = React.useMemo(() => {
        const [field, direction = 'desc'] = sortBy.split(' ');

        return [...data].sort((a, b) => {
            let valueA, valueB;

            switch (field) {
            case 'source':
                valueA = a.source.toLowerCase();
                valueB = b.source.toLowerCase();
                break;
            case 'free_members':
                valueA = a.free_members;
                valueB = b.free_members;
                break;
            case 'paid_members':
                valueA = a.paid_members;
                valueB = b.paid_members;
                break;
            case 'mrr':
                valueA = a.mrr;
                valueB = b.mrr;
                break;
            default:
                return 0;
            }

            if (direction === 'desc') {
                return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
            } else {
                return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
            }
        });
    }, [data, sortBy]);

    const displayData = limit ? sortedData.slice(0, limit) : sortedData;

    return (
        <TableBody>
            {displayData.map(row => (
                <TableRow key={row.source} className='last:border-none'>
                    <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                            <img
                                alt=""
                                className="size-4"
                                src={row.iconSrc}
                                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                    e.currentTarget.src = defaultSourceIconUrl;
                                }}
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
                    <TableCell className='text-right font-mono text-sm'>
                            +{formatNumber(row.paid_members)}
                    </TableCell>
                    <TableCell className='text-right font-mono text-sm'>
                            +{currencySymbol}{centsToDollars(row.mrr)}
                    </TableCell>
                </TableRow>
            ))}
        </TableBody>
    );
};

interface GrowthSourcesProps {
    range: number;
    limit?: number;
    showViewAll?: boolean;
}

export const GrowthSources: React.FC<GrowthSourcesProps> = ({
    range,
    limit = 20,
    showViewAll = false
}) => {
    const {data: globalData} = useGlobalData();
    const {data: referrersData, isLoading} = useReferrersGrowth(range);
    const {data: mrrHistoryResponse} = useMrrHistory();
    const [sortBy, setSortBy] = useState<SourcesOrder>('free_members desc');

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

    // Process and aggregate referrer data
    const processedData = React.useMemo((): ProcessedReferrerData[] => {
        if (!referrersData?.stats) {
            return [];
        }

        // Group by source and sum metrics
        const sourceMap = new Map<string, {signups: number, paid_conversions: number, mrr: number}>();

        referrersData.stats.forEach((item) => {
            const normalizedSource = normalizeSource(item.source || '');
            const existing = sourceMap.get(normalizedSource) || {signups: 0, paid_conversions: 0, mrr: 0};
            sourceMap.set(normalizedSource, {
                signups: existing.signups + item.signups,
                paid_conversions: existing.paid_conversions + item.paid_conversions,
                mrr: existing.mrr + item.mrr
            });
        });

        // Convert to array and calculate metrics
        return Array.from(sourceMap.entries())
            .map(([source, metrics]) => {
                const {domain: faviconDomain} = getFaviconDomain(source, siteUrl);
                const iconSrc = faviconDomain
                    ? `https://www.faviconextractor.com/favicon/${faviconDomain}?larger=true`
                    : defaultSourceIconUrl;
                const linkUrl = faviconDomain ? `https://${faviconDomain}` : undefined;

                return {
                    source,
                    free_members: metrics.signups, // Free signups from members_created_events
                    paid_members: metrics.paid_conversions, // Paid conversions from members_subscription_created_events
                    mrr: metrics.mrr,
                    iconSrc,
                    displayName: source,
                    linkUrl
                };
            })
            .filter((item) => {
                return item.free_members >= 0 && (item.free_members > 0 || item.paid_members > 0); // Skip sources with negative free members, only show sources with conversions
            })
            .sort((a, b) => {
                return (b.free_members + b.paid_members) - (a.free_members + a.paid_members); // Sort by total conversions
            });
    }, [referrersData, siteUrl]);

    const title = 'Top sources';
    const description = `Where did your growth come from ${getPeriodText(range)}`;

    if (isLoading) {
        return (
            <SkeletonTable lines={5} />
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
                    sortBy={sortBy}
                />
            ) : (
                <TableBody>
                    <TableRow>
                        <TableCell className='py-12' colSpan={4}>
                            <div className='flex flex-col items-center justify-center space-y-3 text-center'>
                                <div className='flex size-12 items-center justify-center rounded-full bg-muted'>
                                    <svg className='size-6 text-muted-foreground' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                        <path d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} />
                                    </svg>
                                </div>
                                <div className='space-y-1'>
                                    <h3 className='text-sm font-medium text-foreground'>
                                        No conversions {getPeriodText(range).toLowerCase()}
                                    </h3>
                                    <p className='text-sm text-muted-foreground'>
                                        Try adjusting your date range to see more data.
                                    </p>
                                </div>
                            </div>
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
                                    <SheetHeader className='sticky top-0 z-40 -mx-6 bg-white/60 p-6 backdrop-blur'>
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
                                                </TableRow>
                                            </TableHeader>
                                            <GrowthSourcesTableBody
                                                currencySymbol={currencySymbol}
                                                data={processedData}
                                                defaultSourceIconUrl={defaultSourceIconUrl}
                                                sortBy={sortBy}
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