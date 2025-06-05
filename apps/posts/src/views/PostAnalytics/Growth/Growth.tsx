import KpiCard, {KpiCardContent, KpiCardLabel, KpiCardValue} from '../components/KpiCard';
import PostAnalyticsContent from '../components/PostAnalyticsContent';
import PostAnalyticsHeader from '../components/PostAnalyticsHeader';
import React from 'react';
import {BarChartLoadingIndicator, Card, CardContent, CardDescription, CardHeader, CardTitle, LucideIcon, Separator, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, formatNumber} from '@tryghost/shade';
import {SOURCE_DOMAIN_MAP, extractDomain, getFaviconDomain, useParams} from '@tryghost/admin-x-framework';
import {STATS_DEFAULT_SOURCE_ICON_URL} from '@src/utils/constants';
import {useGlobalData} from '@src/providers/PostAnalyticsContext';
import {usePostReferrers} from '@src/hooks/usePostReferrers';

export const centsToDollars = (value : number) => {
    return Math.round(value / 100);
};

// Check if the source has a valid URL that should be linked
const hasLinkableUrl = (url: string | undefined): boolean => {
    if (!url) {
        return false;
    }

    try {
        new URL(url);
        return true;
    } catch (e) {
        return false;
    }
};

interface postAnalyticsProps {}

const Growth: React.FC<postAnalyticsProps> = () => {
    const {data: globalData} = useGlobalData();
    const {postId} = useParams();
    const {stats: postReferrers, totals, isLoading} = usePostReferrers(postId || '');
    
    // Get site URL from global data
    const siteUrl = globalData?.url as string | undefined;
    
    // TEMPORARY: For testing levernews.com direct traffic grouping
    // Remove this line when done testing  
    const testingSiteUrl = siteUrl || 'https://levernews.com';

    // Process and group sources data with consolidation
    const processedReferrers = React.useMemo(() => {
        if (!postReferrers) {
            return [];
        }
        
        const sourceMap = new Map<string, {
            source: string, 
            free_members: number, 
            paid_members: number, 
            mrr: number,
            isDirectTraffic: boolean,
            domain?: string,
            referrer_url?: string
        }>();
        const directTrafficData = {
            free_members: 0,
            paid_members: 0,
            mrr: 0
        };
        
        // Process each source and group
        postReferrers.forEach((item) => {
            const {domain, isDirectTraffic} = getFaviconDomain(item.source, testingSiteUrl);
            
            if (isDirectTraffic || !item.source || item.source === '') {
                // Accumulate all direct traffic
                directTrafficData.free_members += item.free_members || 0;
                directTrafficData.paid_members += item.paid_members || 0;
                directTrafficData.mrr += item.mrr || 0;
            } else {
                // For non-direct sources, try to find a clean display name
                let displayName = item.source;
                
                // Check if we have a mapping for this source
                const mappedDomain = Object.entries(SOURCE_DOMAIN_MAP).find(([key, value]) => {
                    return key.toLowerCase() === item.source?.toLowerCase() || 
                           value === domain ||
                           item.source?.toLowerCase().includes(key.toLowerCase());
                });
                
                if (mappedDomain) {
                    displayName = mappedDomain[0];
                }
                
                const sourceKey = displayName;
                if (sourceMap.has(sourceKey)) {
                    const existing = sourceMap.get(sourceKey)!;
                    existing.free_members += item.free_members || 0;
                    existing.paid_members += item.paid_members || 0;
                    existing.mrr += item.mrr || 0;
                } else {
                    sourceMap.set(sourceKey, {
                        source: displayName,
                        free_members: item.free_members || 0,
                        paid_members: item.paid_members || 0,
                        mrr: item.mrr || 0,
                        isDirectTraffic: false,
                        domain: domain ?? undefined,
                        referrer_url: item.referrer_url
                    });
                }
            }
        });
        
        // Add consolidated direct traffic entry if there's any
        if (directTrafficData.free_members > 0 || directTrafficData.paid_members > 0 || directTrafficData.mrr > 0) {
            const siteDomain = testingSiteUrl ? extractDomain(testingSiteUrl) : null;
            sourceMap.set('Direct', {
                source: 'Direct',
                free_members: directTrafficData.free_members,
                paid_members: directTrafficData.paid_members,
                mrr: directTrafficData.mrr,
                isDirectTraffic: true,
                domain: siteDomain || undefined
            });
        }
        
        // Convert back to array and sort by total impact (prioritizing MRR, then paid members, then free members)
        return Array.from(sourceMap.values())
            .sort((a, b) => {
                const aScore = (a.mrr || 0) * 100 + (a.paid_members || 0) * 10 + (a.free_members || 0);
                const bScore = (b.mrr || 0) * 100 + (b.paid_members || 0) * 10 + (b.free_members || 0);
                return bScore - aScore;
            });
    }, [postReferrers, testingSiteUrl]);

    return (
        <>
            <PostAnalyticsHeader currentTab='Growth' />
            <PostAnalyticsContent>
                {isLoading ?
                    <div className='flex size-full grow items-center justify-center'>
                        <BarChartLoadingIndicator />
                    </div>
                    :
                    <div className='flex flex-col items-stretch gap-6'>
                        <Card>
                            <CardHeader className='hidden'>
                                <CardTitle>Newsletters</CardTitle>
                                <CardDescription>How did this post perform</CardDescription>
                            </CardHeader>
                            <CardContent className='p-0'>
                                <div className='grid grid-cols-3 items-stretch'>
                                    <KpiCard className='grow'>
                                        <KpiCardLabel>
                                            <LucideIcon.User strokeWidth={1.5} />
                                            Free members
                                        </KpiCardLabel>
                                        <KpiCardContent>
                                            <KpiCardValue>{formatNumber(totals?.free_members || 0)}</KpiCardValue>
                                        </KpiCardContent>
                                    </KpiCard>
                                    <KpiCard className='grow'>
                                        <KpiCardLabel>
                                            <LucideIcon.WalletCards strokeWidth={1.5} />
                                            Paid members
                                        </KpiCardLabel>
                                        <KpiCardContent>
                                            <KpiCardValue>{formatNumber(totals?.paid_members || 0)}</KpiCardValue>
                                        </KpiCardContent>
                                    </KpiCard>
                                    <KpiCard className='grow'>
                                        <KpiCardLabel>
                                            <LucideIcon.CircleDollarSign strokeWidth={1.5} />
                                            MRR
                                        </KpiCardLabel>
                                        <KpiCardContent>
                                            <KpiCardValue>+${centsToDollars(totals?.mrr || 0)}</KpiCardValue>
                                        </KpiCardContent>
                                    </KpiCard>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Sources</CardTitle>
                                <CardDescription>Where did your growth come from?</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Separator />
                                {processedReferrers.length > 0
                                    ?
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
                                            {processedReferrers?.map((row) => {
                                                const iconSrc = row.domain ? 
                                                    `https://www.faviconextractor.com/favicon/${row.domain}?larger=true` : 
                                                    STATS_DEFAULT_SOURCE_ICON_URL;
                                                
                                                return (
                                                    <TableRow key={row.source}>
                                                        <TableCell>
                                                            {row.source && row.referrer_url && hasLinkableUrl(row.referrer_url) ?
                                                                <a className='group flex items-center gap-2' href={row.referrer_url} rel="noreferrer" target="_blank">
                                                                    <img
                                                                        className="size-4"
                                                                        src={iconSrc}
                                                                        onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                                                            e.currentTarget.src = STATS_DEFAULT_SOURCE_ICON_URL;
                                                                        }} />
                                                                    <span className='group-hover:underline'>{row.source}</span>
                                                                </a>
                                                                :
                                                                <span className='flex items-center gap-2'>
                                                                    <img
                                                                        className="size-4"
                                                                        src={iconSrc}
                                                                        onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                                                            e.currentTarget.src = STATS_DEFAULT_SOURCE_ICON_URL;
                                                                        }} />
                                                                    <span>{row.source}</span>
                                                                </span>
                                                            }
                                                        </TableCell>
                                                        <TableCell className='text-right font-mono text-sm'>+{formatNumber(row.free_members)}</TableCell>
                                                        <TableCell className='text-right font-mono text-sm'>+{formatNumber(row.paid_members)}</TableCell>
                                                        <TableCell className='text-right font-mono text-sm'>+${centsToDollars(row.mrr)}</TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                    :
                                    <div className='py-20 text-center text-sm text-gray-700'>
                                    Once someone signs up on this post, sources will show here.
                                    </div>
                                }
                            </CardContent>
                        </Card>
                    </div>
                }
            </PostAnalyticsContent>
        </>
    );
};

export default Growth;
