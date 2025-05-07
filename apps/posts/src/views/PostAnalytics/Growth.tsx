import KpiCard, {KpiCardIcon, KpiCardLabel, KpiCardValue} from './components/KpiCard';
import PostAnalyticsContent from './components/PostAnalyticsContent';
import PostAnalyticsHeader from './components/PostAnalyticsHeader';
import PostAnalyticsLayout from './layout/PostAnalyticsLayout';
import {Card, CardContent, CardDescription, CardHeader, CardTitle, LucideIcon, Separator, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, ViewHeader, formatNumber} from '@tryghost/shade';
import {useParams} from '@tryghost/admin-x-framework';
import {usePostReferrers} from '../../hooks/usePostReferrers';

const centsToDollars = (value : number) => {
    return Math.round(value / 100);
};

const STATS_DEFAULT_SOURCE_ICON_URL = 'https://static.ghost.org/v5.0.0/images/globe-icon.svg';

interface postAnalyticsProps {}

const Growth: React.FC<postAnalyticsProps> = () => {
    // const {isLoading: isConfigLoading} = useGlobalData();
    const {postId} = useParams();
    const {stats: postReferrers, totals, isLoading} = usePostReferrers(postId || '');

    return (
        <PostAnalyticsLayout>
            <ViewHeader className='items-end pb-4'>
                <PostAnalyticsHeader currentTab='Growth' />
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
                                <KpiCardValue>{formatNumber(totals?.free_members || 0)}</KpiCardValue>
                            </KpiCard>
                            <KpiCard>
                                <KpiCardIcon>
                                    <LucideIcon.Wallet strokeWidth={1.5} />
                                </KpiCardIcon>
                                <KpiCardLabel>Paid members</KpiCardLabel>
                                <KpiCardValue>{formatNumber(totals?.paid_members || 0)}</KpiCardValue>
                            </KpiCard>
                            <KpiCard>
                                <KpiCardIcon>
                                    <LucideIcon.CircleDollarSign strokeWidth={1.5} />
                                </KpiCardIcon>
                                <KpiCardLabel>MRR</KpiCardLabel>
                                <KpiCardValue>+${centsToDollars(totals?.mrr || 0)}</KpiCardValue>
                            </KpiCard>
                        </div>
                        <Card>
                            <CardHeader>
                                <CardTitle>Sources</CardTitle>
                                <CardDescription>Where did your growth come from?</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Separator />
                                {postReferrers.length > 0
                                    ?
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
                                            {postReferrers?.map(row => (
                                                <TableRow key={row.source}>
                                                    <TableCell>
                                                        <a className='inline-flex items-center gap-2 font-medium' href={`https://${row.source}`} rel="noreferrer" target='_blank'>
                                                            <img
                                                                className="size-4"
                                                                src={`https://www.faviconextractor.com/favicon/${row.source || 'direct'}?larger=true`}
                                                                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                                                    e.currentTarget.src = STATS_DEFAULT_SOURCE_ICON_URL;
                                                                }} />
                                                            <span>{row.source || 'Direct'}</span>
                                                        </a>
                                                    </TableCell>
                                                    <TableCell className='text-right font-mono text-sm'>+{formatNumber(row.free_members)}</TableCell>
                                                    <TableCell className='text-right font-mono text-sm'>+{formatNumber(row.paid_members)}</TableCell>
                                                    <TableCell className='text-right font-mono text-sm'>+${centsToDollars(row.mrr)}</TableCell>
                                                </TableRow>
                                            ))}
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
        </PostAnalyticsLayout>
    );
};

export default Growth;
