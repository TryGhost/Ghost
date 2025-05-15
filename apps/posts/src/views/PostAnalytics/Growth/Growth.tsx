import KpiCard, {KpiCardContent, KpiCardLabel, KpiCardValue} from '../components/KpiCard';
import PostAnalyticsContent from '../components/PostAnalyticsContent';
import PostAnalyticsHeader from '../components/PostAnalyticsHeader';
import {BarChartLoadingIndicator, Card, CardContent, CardDescription, CardHeader, CardTitle, LucideIcon, Separator, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, formatNumber} from '@tryghost/shade';
import {SourceRow} from '../Web/components/Sources';
import {useParams} from '@tryghost/admin-x-framework';
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
    // const {isLoading: isConfigLoading} = useGlobalData();
    const {postId} = useParams();
    const {stats: postReferrers, totals, isLoading} = usePostReferrers(postId || '');

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
                                <div className='flex items-stretch'>
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
                                                        {row.source && row.referrer_url && hasLinkableUrl(row.referrer_url) ?
                                                            <a className='group flex items-center gap-1' href={row.referrer_url} rel="noreferrer" target="_blank">
                                                                <SourceRow className='group-hover:underline' source={row.source} />
                                                            </a>
                                                            :
                                                            <span className='flex items-center gap-1'>
                                                                <SourceRow source={row.source} />
                                                            </span>
                                                        }
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
        </>
    );
};

export default Growth;
