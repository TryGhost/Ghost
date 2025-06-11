import React from 'react';
import {getFaviconDomain, getSymbol} from '@tryghost/admin-x-framework';
import {useMrrHistory} from '@tryghost/admin-x-framework/api/stats';
import {Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, LucideIcon, Separator, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SkeletonTable, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, centsToDollars, formatNumber} from '@tryghost/shade';
import {getPeriodText} from '@src/utils/chart-helpers';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useReferrersWithRange} from '@src/hooks/useReferrersWithRange';

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
    mrr: number; // estimated from paid_conversions
    iconSrc: string;
    displayName: string;
    linkUrl?: string;
}

interface GrowthSourcesTableProps {
    data: ProcessedReferrerData[];
    currencySymbol: string;
    limit?: number;
    defaultSourceIconUrl: string;
}

const GrowthSourcesTable: React.FC<GrowthSourcesTableProps> = ({data, currencySymbol, limit, defaultSourceIconUrl}) => {
    const displayData = limit ? data.slice(0, limit) : data;

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead className='w-[110px] text-right'>Free members</TableHead>
                    <TableHead className='w-[110px] text-right'>Paid members</TableHead>
                    <TableHead className='w-[110px] text-right'>MRR impact</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {displayData.map((row) => (
                    <TableRow key={row.source}>
                        <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                                <img
                                    className="size-4"
                                    src={row.iconSrc}
                                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                        e.currentTarget.src = defaultSourceIconUrl;
                                    }}
                                    alt=""
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
        </Table>
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
    const {data: referrersData, isLoading} = useReferrersWithRange(range);
    const {data: mrrHistoryResponse} = useMrrHistory();

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
        const sourceMap = new Map<string, {signups: number, paid_conversions: number}>();
        
        referrersData.stats.forEach((item) => {
            const normalizedSource = normalizeSource(item.source || '');
            const existing = sourceMap.get(normalizedSource) || {signups: 0, paid_conversions: 0};
            sourceMap.set(normalizedSource, {
                signups: existing.signups + item.signups,
                paid_conversions: existing.paid_conversions + item.paid_conversions
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
                    free_members: metrics.signups - metrics.paid_conversions, // Free = total signups - paid
                    paid_members: metrics.paid_conversions,
                    mrr: metrics.paid_conversions * 500, // Rough estimate: $5/month per paid conversion
                    iconSrc,
                    displayName: source,
                    linkUrl
                };
            })
            .filter((item) => {
                return item.free_members > 0 || item.paid_members > 0; // Only show sources with conversions
            })
            .sort((a, b) => {
                return (b.free_members + b.paid_members) - (a.free_members + a.paid_members); // Sort by total conversions
            });
    }, [referrersData]);

    const title = 'Top sources';
    const description = `Where did your growth come from ${getPeriodText(range)}`;

    if (isLoading) {
        return (
            <Card className='group/datalist'>
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </CardHeader>
                <CardContent>
                    <SkeletonTable lines={5} />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className='group/datalist'>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <Separator />
                {processedData.length > 0 ? (
                    <GrowthSourcesTable 
                        currencySymbol={currencySymbol}
                        data={processedData}
                        limit={limit}
                        defaultSourceIconUrl={defaultSourceIconUrl}
                    />
                ) : (
                    <div className='py-20 text-center text-sm text-gray-700'>
                        Once someone signs up, sources will show here.
                    </div>
                )}
            </CardContent>
            {showViewAll && processedData.length > limit &&
                <CardFooter>
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
                                <GrowthSourcesTable 
                                    currencySymbol={currencySymbol}
                                    data={processedData}
                                    defaultSourceIconUrl={defaultSourceIconUrl}
                                />
                            </div>
                        </SheetContent>
                    </Sheet>
                </CardFooter>
            }
        </Card>
    );
};

export default GrowthSources; 