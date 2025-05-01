import DateRangeSelect from './components/DateRangeSelect';
import KpiCard, {KpiCardIcon, KpiCardLabel, KpiCardValue} from './components/KpiCard';
import PostAnalyticsContent from './components/PostAnalyticsContent';
import PostAnalyticsHeader from './components/PostAnalyticsHeader';
import PostAnalyticsLayout from './layout/PostAnalyticsLayout';
import {Card, CardContent, CardDescription, CardHeader, CardTitle, LucideIcon, Separator, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, ViewHeader, ViewHeaderActions, formatNumber} from '@tryghost/shade';
import {PostReferrerItem, usePostReferrers} from '@tryghost/admin-x-framework/api/stats';
import {getRangeDates} from '@src/utils/chart-helpers';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useParams} from '@tryghost/admin-x-framework';
import {useMemo} from 'react';

const STATS_DEFAULT_SOURCE_ICON_URL = 'https://static.ghost.org/v5.0.0/images/globe-icon.svg';

interface PostAnalyticsProps {}

interface SourceData {
    id: string;
    title: string | null;
    freeMembers: number;
    paidMembers: number;
    mrr: number;
}

const Growth: React.FC<PostAnalyticsProps> = () => {
    const {isLoading: isConfigLoading} = useGlobalData();
    const {range} = useGlobalData();
    const {postId} = useParams();
    const {startDate, endDate} = getRangeDates(range);
    
    const dateFrom = startDate.format('YYYY-MM-DD');
    const dateTo = endDate.format('YYYY-MM-DD');
    
    const {data, isLoading: isStatsLoading} = usePostReferrers(postId || '', {
        searchParams: {
            date_from: dateFrom,
            date_to: dateTo
        },
        enabled: !!postId
    });
    
    const {topSources, totals} = useMemo(() => {
        if (!data || !data.stats) {
            return {topSources: [], totals: {freeMembers: 0, paidMembers: 0, mrr: 0}};
        }
        
        // Convert API response to the format needed by our component
        const sources = data.stats[0].map((stat: PostReferrerItem) => ({
            id: `source-${stat.source || 'direct'}`,
            title: stat.source || 'Direct',
            freeMembers: (stat.signups || 0),
            paidMembers: (stat.paid_conversions || 0),
            mrr: (stat.paid_conversions || 0) * 10 // Assuming $10 MRR per conversion
        }));
        
        // Calculate totals
        const freeTotal = sources.reduce((sum: number, source: SourceData) => sum + source.freeMembers, 0);
        const paidTotal = sources.reduce((sum: number, source: SourceData) => sum + source.paidMembers, 0);
        const mrrTotal = sources.reduce((sum: number, source: SourceData) => sum + source.mrr, 0);
        
        return {
            topSources: sources,
            totals: {
                freeMembers: freeTotal,
                paidMembers: paidTotal,
                mrr: mrrTotal
            }
        };
    }, [data]);

    const isLoading = isConfigLoading || isStatsLoading;

    return (
        <PostAnalyticsLayout>
            <ViewHeader className='items-end pb-4'>
                <PostAnalyticsHeader currentTab='Growth' />
                <ViewHeaderActions className='mb-2'>
                    <DateRangeSelect />
                </ViewHeaderActions>
            </ViewHeader>
            <PostAnalyticsContent>
                {isLoading ? 'Loading' :
                    <div className='flex flex-col items-stretch gap-6'>
                        <div className='grid grid-cols-3 gap-6'>
                            <KpiCard>
                                <KpiCardIcon>
                                    <LucideIcon.User strokeWidth={1.5} />
                                </KpiCardIcon>
                                <KpiCardLabel>Free members</KpiCardLabel>
                                <KpiCardValue>{formatNumber(totals.freeMembers)}</KpiCardValue>
                            </KpiCard>
                            <KpiCard>
                                <KpiCardIcon>
                                    <LucideIcon.Wallet strokeWidth={1.5} />
                                </KpiCardIcon>
                                <KpiCardLabel>Paid members</KpiCardLabel>
                                <KpiCardValue>{formatNumber(totals.paidMembers)}</KpiCardValue>
                            </KpiCard>
                            <KpiCard>
                                <KpiCardIcon>
                                    <LucideIcon.CircleDollarSign strokeWidth={1.5} />
                                </KpiCardIcon>
                                <KpiCardLabel>MRR</KpiCardLabel>
                                <KpiCardValue>+${totals.mrr}</KpiCardValue>
                            </KpiCard>
                        </div>
                        <Card>
                            <CardHeader>
                                <CardTitle>Sources</CardTitle>
                                <CardDescription>Where did your growth come from?</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Separator />
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Source</TableHead>
                                            <TableHead className='w-[110px] text-right'>Free members</TableHead>
                                            <TableHead className='w-[110px] text-right'>Paid members</TableHead>
                                            <TableHead className='w-[110px] text-right'>MRR</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {topSources.length > 0 ? topSources.map((source: SourceData) => (
                                            <TableRow key={source.id}>
                                                <TableCell>
                                                    <a className='inline-flex items-center gap-2 font-medium' href={source.title ? `https://${source.title}` : undefined} rel="noreferrer" target='_blank'>
                                                        <img
                                                            className="size-4"
                                                            src={`https://www.faviconextractor.com/favicon/${source.title || 'direct'}?larger=true`}
                                                            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                                                e.currentTarget.src = STATS_DEFAULT_SOURCE_ICON_URL;
                                                            }} />
                                                        <span>{source.title || 'Direct'}</span>
                                                    </a>
                                                </TableCell>
                                                <TableCell className='text-right font-mono text-sm'>+{formatNumber(source.freeMembers)}</TableCell>
                                                <TableCell className='text-right font-mono text-sm'>+{formatNumber(source.paidMembers)}</TableCell>
                                                <TableCell className='text-right font-mono text-sm'>+${source.mrr}</TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow>
                                                <TableCell className="py-4 text-center" colSpan={4}>No data available for this period</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                }
            </PostAnalyticsContent>
        </PostAnalyticsLayout>
    );
};

export default Growth;
