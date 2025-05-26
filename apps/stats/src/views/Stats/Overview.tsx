import DateRangeSelect from './components/DateRangeSelect';
import React from 'react';
import StatsHeader from './layout/StatsHeader';
import StatsLayout from './layout/StatsLayout';
import StatsView from './layout/StatsView';
import {Card, CardContent, CardDescription, CardHeader, CardTitle, KpiCardHeader, KpiCardHeaderContent, KpiCardHeaderLabel, KpiCardHeaderValue, LucideIcon} from '@tryghost/shade';
import {useNavigate} from '@tryghost/admin-x-framework';

const Overview: React.FC = () => {
    const navigate = useNavigate();
    // const tabConfig = {
    //     visitors: {
    //         color: 'hsl(var(--chart-blue))'
    //     },
    //     'free-members': {
    //         color: 'hsl(var(--chart-green))'
    //     },
    //     'paid-members': {
    //         color: 'hsl(var(--chart-purple))'
    //     },
    //     mrr: {
    //         color: 'hsl(var(--chart-orange))'
    //     }
    // };

    return (
        <StatsLayout>
            <StatsHeader>
                <DateRangeSelect />
            </StatsHeader>
            <StatsView isLoading={false}>
                <div className='grid grid-cols-1 gap-8 lg:grid-cols-3'>
                    <Card className='hover:cursor-pointer hover:bg-accent' onClick={() => {
                        navigate('/web/');
                    }}>
                        <CardHeader className='hidden'>
                            <CardTitle>Unique visitors</CardTitle>
                            <CardDescription>Number of individual people who visited your website</CardDescription>
                        </CardHeader>
                        <KpiCardHeader className='grow border-none'>
                            <KpiCardHeaderLabel>
                                <LucideIcon.MousePointer size={16} strokeWidth={1.5} />
                                    Unique visitors
                            </KpiCardHeaderLabel>
                            <KpiCardHeaderContent>
                                <KpiCardHeaderValue>3,784</KpiCardHeaderValue>
                            </KpiCardHeaderContent>
                        </KpiCardHeader>
                        <CardContent>
                            Unique visitors chart
                        </CardContent>
                    </Card>
                    <Card className='hover:cursor-pointer hover:bg-accent' onClick={() => {
                        navigate('/growth/');
                    }}>
                        <CardHeader className='hidden'>
                            <CardTitle>Members</CardTitle>
                            <CardDescription>How number of members of your publication changed over time</CardDescription>
                        </CardHeader>
                        <KpiCardHeader className='grow border-none'>
                            <KpiCardHeaderLabel>
                                <LucideIcon.User size={16} strokeWidth={1.5} />
                                    Members
                            </KpiCardHeaderLabel>
                            <KpiCardHeaderContent>
                                <KpiCardHeaderValue>1,834</KpiCardHeaderValue>
                            </KpiCardHeaderContent>
                        </KpiCardHeader>
                        <CardContent>
                            Members chart
                        </CardContent>
                    </Card>
                    <Card className='hover:cursor-pointer hover:bg-accent' onClick={() => {
                        navigate('/growth/');
                    }}>
                        <CardHeader className='hidden'>
                            <CardTitle>MRR</CardTitle>
                            <CardDescription>Monthly recurring revenue changes over time</CardDescription>
                        </CardHeader>
                        <KpiCardHeader className='grow border-none'>
                            <KpiCardHeaderLabel>
                                <LucideIcon.DollarSign size={16} strokeWidth={1.5} />
                                    MRR
                            </KpiCardHeaderLabel>
                            <KpiCardHeaderContent>
                                <KpiCardHeaderValue>$2,789</KpiCardHeaderValue>
                            </KpiCardHeaderContent>
                        </KpiCardHeader>
                        <CardContent>
                            MRR chart
                        </CardContent>
                    </Card>
                </div>
                <div className='grid grid-cols-1 gap-8 lg:grid-cols-3'>
                    <Card>
                        <CardHeader>
                            <CardTitle>Latest post performance</CardTitle>
                            <CardDescription className='hidden'>How your last post did</CardDescription>
                        </CardHeader>
                        <CardContent>
                            Post performance
                        </CardContent>
                    </Card>
                    <Card className='lg:col-span-2'>
                        <CardHeader className='hidden'>
                            <CardTitle>Top posts</CardTitle>
                            <CardDescription>Best performing post in the period</CardDescription>
                        </CardHeader>
                        <CardContent>
                            Top posts
                        </CardContent>
                    </Card>
                </div>
                <div className='grid grid-cols-1 gap-8 lg:grid-cols-2'>
                    <Card>
                        <CardHeader className='hidden'>
                            <CardTitle>Growing your audience</CardTitle>
                            <CardDescription>Tips for growth</CardDescription>
                        </CardHeader>
                        <CardContent>
                            Bookmark card 1
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className='hidden'>
                            <CardTitle>Analytics in Ghost</CardTitle>
                            <CardDescription>Help to get started</CardDescription>
                        </CardHeader>
                        <CardContent>
                            Bookmark card 1
                        </CardContent>
                    </Card>
                </div>
            </StatsView>
        </StatsLayout>
    );
};

export default Overview;