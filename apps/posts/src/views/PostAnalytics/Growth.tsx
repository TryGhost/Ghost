import DateRangeSelect from './components/DateRangeSelect';
import KpiCard, {KpiCardIcon, KpiCardLabel, KpiCardValue} from './components/KpiCard';
import PostAnalyticsContent from './components/PostAnalyticsContent';
import PostAnalyticsHeader from './components/PostAnalyticsHeader';
import PostAnalyticsLayout from './layout/PostAnalyticsLayout';
import {Card, CardContent, CardDescription, CardHeader, CardTitle, LucideIcon, Separator, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, ViewHeader, ViewHeaderActions, formatNumber} from '@tryghost/shade';

const STATS_DEFAULT_SOURCE_ICON_URL = 'https://static.ghost.org/v5.0.0/images/globe-icon.svg';

interface postAnalyticsProps {}

const Growth: React.FC<postAnalyticsProps> = () => {
    // const {isLoading: isConfigLoading} = useGlobalData();
    // const {range} = useGlobalData();

    const isLoading = false;

    const mockTopSources = [
        {id: 'source-001', title: 'google.com', freeMembers: 17, paidMembers: 7, mrr: 8},
        {id: 'source-002', title: 'twitter.com', freeMembers: 12, paidMembers: 5, mrr: 6},
        {id: 'source-003', title: 'facebook.com', freeMembers: 9, paidMembers: 4, mrr: 5},
        {id: 'source-004', title: 'linkedin.com', freeMembers: 8, paidMembers: 3, mrr: 4},
        {id: 'source-005', title: 'reddit.com', freeMembers: 7, paidMembers: 2, mrr: 3},
        {id: 'source-006', title: 'medium.com', freeMembers: 6, paidMembers: 2, mrr: 3}
    ];

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
                                <KpiCardValue>{formatNumber(22)}</KpiCardValue>
                            </KpiCard>
                            <KpiCard>
                                <KpiCardIcon>
                                    <LucideIcon.Wallet strokeWidth={1.5} />
                                </KpiCardIcon>
                                <KpiCardLabel>Paid members</KpiCardLabel>
                                <KpiCardValue>{formatNumber(8)}</KpiCardValue>
                            </KpiCard>
                            <KpiCard>
                                <KpiCardIcon>
                                    <LucideIcon.CircleDollarSign strokeWidth={1.5} />
                                </KpiCardIcon>
                                <KpiCardLabel>MRR</KpiCardLabel>
                                <KpiCardValue>+$180</KpiCardValue>
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
                                        {mockTopSources.map(source => (
                                            <TableRow key={source.id}>
                                                <TableCell>
                                                    <a className='inline-flex items-center gap-2 font-medium' href={`https://${source.title}`} rel="noreferrer" target='_blank'>
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
                                        ))}
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
