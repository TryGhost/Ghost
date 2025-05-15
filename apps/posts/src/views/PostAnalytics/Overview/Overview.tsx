import DateRangeSelect from '../components/DateRangeSelect';
import KpiCard, {KpiCardContent, KpiCardLabel, KpiCardValue} from '../components/KpiCard';
import PostAnalyticsContent from '../components/PostAnalyticsContent';
import PostAnalyticsHeader from '../components/PostAnalyticsHeader';
import {Card, CardContent, CardDescription, CardHeader, CardTitle, LucideIcon, formatNumber} from '@tryghost/shade';

const Overview: React.FC = () => {
    return (
        <>
            <PostAnalyticsHeader currentTab='Overview'>
                <DateRangeSelect />
            </PostAnalyticsHeader>
            <PostAnalyticsContent>
                <Card className='p-0'>
                    <CardHeader className='hidden'>
                        <CardTitle>Newsletter performance</CardTitle>
                    </CardHeader>
                    <CardContent className='flex items-stretch p-0'>
                        <KpiCard className='grow'>
                            <KpiCardLabel>
                                <LucideIcon.MousePointer size={16} strokeWidth={1.5} />
                                Unique visitors
                            </KpiCardLabel>
                            <KpiCardContent>
                                <KpiCardValue>{formatNumber(18997)}</KpiCardValue>
                            </KpiCardContent>
                        </KpiCard>
                        <KpiCard className='grow'>
                            <KpiCardLabel>
                                <LucideIcon.Eye size={16} strokeWidth={1.5} />
                                Pageviews
                            </KpiCardLabel>
                            <KpiCardContent>
                                <KpiCardValue>{formatNumber(29127)}</KpiCardValue>
                            </KpiCardContent>
                        </KpiCard>
                        <KpiCard className='grow'>
                            <KpiCardLabel>
                                <LucideIcon.UserPlus size={16} strokeWidth={1.5} />
                                Conversions
                            </KpiCardLabel>
                            <KpiCardContent>
                                <KpiCardValue>{formatNumber(18997)}</KpiCardValue>
                            </KpiCardContent>
                        </KpiCard>
                        <KpiCard className='grow'>
                            <KpiCardLabel>
                                <LucideIcon.DollarSign size={16} strokeWidth={1.5} />
                                MRR impact
                            </KpiCardLabel>
                            <KpiCardContent>
                                <KpiCardValue>$91</KpiCardValue>
                            </KpiCardContent>
                        </KpiCard>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Newsletter performance</CardTitle>
                        <CardDescription>How members interacted with this email</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className='grid grid-cols-2 gap-8'>
                            <div>Charts</div>
                            <div>Link clicks table</div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Web performance</CardTitle>
                        <CardDescription>Unique visitors since you published this post</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div>Chart</div>
                    </CardContent>
                </Card>
                <div className='grid grid-cols-2 gap-8'>
                    <Card>
                        <CardHeader>
                            <CardTitle>Help box 1</CardTitle>
                        </CardHeader>
                        <CardContent>
                            Description...
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Help box 2</CardTitle>
                        </CardHeader>
                        <CardContent>
                            Description...
                        </CardContent>
                    </Card>
                </div>
            </PostAnalyticsContent>
        </>
    );
};

export default Overview;
