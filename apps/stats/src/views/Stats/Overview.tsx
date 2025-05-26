import DateRangeSelect from './components/DateRangeSelect';
import React from 'react';
import StatsHeader from './layout/StatsHeader';
import StatsLayout from './layout/StatsLayout';
import StatsView from './layout/StatsView';
import {Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, KpiCardHeader, KpiCardHeaderContent, KpiCardHeaderLabel, KpiCardHeaderValue, LucideIcon} from '@tryghost/shade';
import {useNavigate} from '@tryghost/admin-x-framework';

interface OverviewKPICardProps {
    linkto: string;
    title: string;
    iconName: keyof typeof LucideIcon;
    description: string;
    color?: string;
    formattedValue: string;
    children?: React.ReactNode;
}

const OverviewKPICard: React.FC<OverviewKPICardProps> = ({
    linkto,
    title,
    iconName,
    description,
    // color,
    formattedValue,
    children
}) => {
    const navigate = useNavigate();
    const IconComponent = LucideIcon[iconName] as LucideIcon.LucideIcon;

    return (
        <Card className='hover:cursor-pointer hover:bg-accent' onClick={() => {
            navigate(linkto);
        }}>
            <CardHeader className='hidden'>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <KpiCardHeader className='grow border-none'>
                <KpiCardHeaderLabel>
                    {IconComponent && <IconComponent size={16} strokeWidth={1.5} />}
                    {title}
                </KpiCardHeaderLabel>
                <KpiCardHeaderContent>
                    <KpiCardHeaderValue>{formattedValue}</KpiCardHeaderValue>
                </KpiCardHeaderContent>
            </KpiCardHeader>
            <CardContent>
                {children}
            </CardContent>
        </Card>
    );
};

const Overview: React.FC = () => {
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
                    <OverviewKPICard
                        description='Number of individual people who visited your website'
                        formattedValue='2,456'
                        iconName='MousePointer'
                        linkto='/web/'
                        title='Unique visitors'
                    >
                        Chart
                    </OverviewKPICard>

                    <OverviewKPICard
                        description='How number of members of your publication changed over time'
                        formattedValue='1,456'
                        iconName='User'
                        linkto='/growth/'
                        title='Members'
                    >
                        Chart
                    </OverviewKPICard>

                    <OverviewKPICard
                        description='Monthly recurring revenue changes over time'
                        formattedValue='1,456'
                        iconName='DollarSign'
                        linkto='/growth/'
                        title='MRR'
                    >
                        Chart
                    </OverviewKPICard>
                </div>
                <div className='grid grid-cols-1 gap-8 lg:grid-cols-3'>
                    <Card>
                        <CardHeader>
                            <CardTitle>Latest post performance</CardTitle>
                            <CardDescription className='hidden'>How your last post did</CardDescription>
                        </CardHeader>
                        <CardContent className='flex flex-col items-stretch gap-6'>
                            <div className='flex flex-col items-stretch gap-3'>
                                <div className='aspect-video w-full rounded-md bg-cover' style={{
                                    backgroundImage: 'url(https://picsum.photos/1920/1080?random)'
                                }}></div>
                            </div>
                            <div className='flex flex-col items-stretch gap-2 text-sm'>
                                <div className='flex items-center justify-between'>
                                    <div className='flex items-center gap-1 font-medium text-muted-foreground'>
                                        <LucideIcon.Eye size={16} strokeWidth={1.5} />
                                        Views
                                    </div>
                                    <div className='font-mono'>1,234</div>
                                </div>
                                <div className='flex items-center justify-between'>
                                    <div className='flex items-center gap-1 font-medium text-muted-foreground'>
                                        <LucideIcon.MailOpen size={16} strokeWidth={1.5} />
                                        Open rate
                                    </div>
                                    <div className='font-mono'>1,234</div>
                                </div>
                                <div className='flex items-center justify-between'>
                                    <div className='flex items-center gap-1 font-medium text-muted-foreground'>
                                        <LucideIcon.User size={16} strokeWidth={1.5} />
                                        Members
                                    </div>
                                    <div className='font-mono'>1,234</div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className='flex items-center justify-between gap-3'>
                            <Button><LucideIcon.Share /> Share post</Button>
                            <Button variant='outline'><LucideIcon.BarChart />Post analytics</Button>
                        </CardFooter>
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