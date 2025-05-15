import DateRangeSelect from '../components/DateRangeSelect';
import KpiCard, {KpiCardContent, KpiCardLabel, KpiCardValue} from '../components/KpiCard';
import NewsletterOverview from './components/NewsletterPerformance';
import PostAnalyticsContent from '../components/PostAnalyticsContent';
import PostAnalyticsHeader from '../components/PostAnalyticsHeader';
import WebOverview from './components/WebPerformance';
import {Button, Card, CardContent, CardDescription, CardHeader, CardTitle, LucideIcon, Separator, formatNumber} from '@tryghost/shade';
import {useNavigate, useParams} from '@tryghost/admin-x-framework';

const Overview: React.FC = () => {
    const {postId} = useParams();
    const navigate = useNavigate();

    return (
        <>
            <PostAnalyticsHeader currentTab='Overview'>
                <DateRangeSelect />
            </PostAnalyticsHeader>
            <PostAnalyticsContent>
                <Card className='overflow-hidden p-0'>
                    <CardHeader className='hidden'>
                        <CardTitle>Newsletter performance</CardTitle>
                    </CardHeader>
                    <CardContent className='flex items-stretch p-0'>
                        <KpiCard className='grow' onClick={() => {
                            navigate(`/analytics/x/${postId}/web`);
                        }}>
                            <KpiCardLabel>
                                <LucideIcon.MousePointer size={16} strokeWidth={1.5} />
                                Unique visitors
                            </KpiCardLabel>
                            <KpiCardContent>
                                <KpiCardValue>{formatNumber(18997)}</KpiCardValue>
                            </KpiCardContent>
                        </KpiCard>
                        <KpiCard className='grow' onClick={() => {
                            navigate(`/analytics/x/${postId}/web`);
                        }}>
                            <KpiCardLabel>
                                <LucideIcon.Eye size={16} strokeWidth={1.5} />
                                Pageviews
                            </KpiCardLabel>
                            <KpiCardContent>
                                <KpiCardValue>{formatNumber(29127)}</KpiCardValue>
                            </KpiCardContent>
                        </KpiCard>
                        <KpiCard className='grow' onClick={() => {
                            navigate(`/analytics/x/${postId}/growth`);
                        }}>
                            <KpiCardLabel>
                                <LucideIcon.UserPlus size={16} strokeWidth={1.5} />
                                Conversions
                            </KpiCardLabel>
                            <KpiCardContent>
                                <KpiCardValue>{formatNumber(18997)}</KpiCardValue>
                            </KpiCardContent>
                        </KpiCard>
                        <KpiCard className='grow' onClick={() => {
                            navigate(`/analytics/x/${postId}/growth`);
                        }}>
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
                <Card className='group/card'>
                    <div className='flex items-center justify-between gap-6'>
                        <CardHeader>
                            <CardTitle>Newsletter performance</CardTitle>
                            <CardDescription>How members interacted with this email</CardDescription>
                        </CardHeader>
                        <Button className='mr-6 opacity-0 transition-all group-hover/card:opacity-100' variant='outline' onClick={() => {
                            navigate(`/analytics/x/${postId}/newsletter`);
                        }}>
                                View more
                            <LucideIcon.ArrowRight />
                        </Button>
                    </div>
                    <CardContent>
                        <Separator />
                        <NewsletterOverview />
                    </CardContent>
                </Card>
                <Card className='group/card'>
                    <div className='flex items-center justify-between gap-6'>
                        <CardHeader>
                            <CardTitle>Web performance</CardTitle>
                            <CardDescription>Unique visitors since you published this post</CardDescription>
                        </CardHeader>
                        <Button className='mr-6 opacity-0 transition-all group-hover/card:opacity-100' variant='outline' onClick={() => {
                            navigate(`/analytics/x/${postId}/web`);
                        }}>
                                View more
                            <LucideIcon.ArrowRight />
                        </Button>
                    </div>
                    <CardContent>
                        <Separator />
                        <WebOverview />
                    </CardContent>
                </Card>
                {/* <div className='grid grid-cols-2 gap-8'>
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
                </div> */}
            </PostAnalyticsContent>
        </>
    );
};

export default Overview;
