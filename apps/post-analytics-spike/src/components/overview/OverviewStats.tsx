// The main Web stats component that encapsulates the breakdown
'use client';

import {Badge, Bar, BarChart, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, ChartConfig, ChartContainer, Separator} from '@tryghost/shade';

const OverviewStats = () => {
    const chartData = [
        {month: 'January', desktop: 186, mobile: 80},
        {month: 'February', desktop: 305, mobile: 200},
        {month: 'March', desktop: 237, mobile: 120},
        {month: 'April', desktop: 73, mobile: 190},
        {month: 'May', desktop: 209, mobile: 130},
        {month: 'June', desktop: 214, mobile: 140}
    ];

    const chartConfig = {
        desktop: {
            label: 'Desktop',
            color: '#2563eb'
        },
        mobile: {
            label: 'Mobile',
            color: '#60a5fa'
        }
    } satisfies ChartConfig;

    return (
        <div className="grid w-full grid-cols-3 gap-6 py-6">
            <Card className='col-span-2'>
                <CardHeader>
                    <CardTitle>Newsletter performance</CardTitle>
                    <CardDescription><Badge>Sent</Badge> — September 19 2024</CardDescription>
                </CardHeader>
                <CardContent>
                    <Separator />
                    <ChartContainer config={chartConfig}>
                        <BarChart data={chartData} accessibilityLayer>
                            <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} />
                            <Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} />
                        </BarChart>
                    </ChartContainer>
                </CardContent>
                <CardFooter>
                    <p>Card Footer</p>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Feedback</CardTitle>
                    <CardDescription>17 reactions</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Card Content</p>
                </CardContent>
                <CardFooter>
                    <p>Card Footer</p>
                </CardFooter>
            </Card>

            <Card className='col-span-2'>
                <CardHeader>
                    <CardTitle>Click performance</CardTitle>
                    <CardDescription>Top links in email newsletter</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Card Content</p>
                </CardContent>
                <CardFooter>
                    <p>Card Footer</p>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Conversion</CardTitle>
                    <CardDescription>3 members signed up on this post</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Card Content</p>
                </CardContent>
                <CardFooter>
                    <p>Card Footer</p>
                </CardFooter>
            </Card>
        </div>
    );
};

export default OverviewStats;