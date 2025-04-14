import Header from '@src/components/layout/Header';
import React from 'react';
import StatsLayout from './layout/StatsLayout';
import WebKpis from './components/WebKpis';
import {Card, CardContent, CardDescription, CardHeader, CardTitle, Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue, Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@tryghost/shade';
import {formatNumber} from '@src/utils/data-formatters';

const Web:React.FC = () => {
    const posts = [
        {
            id: 1,
            title: 'Top 3D printing secrets',
            visitors: 8099,
            views: 12875
        },
        {
            id: 2,
            title: 'Endless summer rusty dancemoves the scenic route captain’s table',
            visitors: 7536,
            views: 9746
        },
        {
            id: 3,
            title: 'Three months in Asia the road less travelled whale shark diving vacation mood',
            visitors: 6735,
            views: 9644
        },
        {
            id: 4,
            title: 'Minimal & Functional Desk Setup in Arizona',
            visitors: 5036,
            views: 8730
        }
    ];

    return (
        <StatsLayout>
            <Header>
                Web
                <Select value='last-30-days'>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select a period" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            <SelectLabel>Period</SelectLabel>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="last-7-days">Last 7 days</SelectItem>
                            <SelectItem value="last-30-days">Last 30 days</SelectItem>
                            <SelectItem value="last-3-months">Last 3 months</SelectItem>
                            <SelectItem value="year-to-date">Year to date</SelectItem>
                            <SelectItem value="last-12-months">Last 12 months</SelectItem>
                            <SelectItem value="all-time">All time</SelectItem>
                        </SelectGroup>
                    </SelectContent>
                </Select>
            </Header>
            <section className='grid grid-cols-1 gap-8'>
                <Card variant='plain'>
                    <CardContent>
                        <WebKpis />
                    </CardContent>
                </Card>
                <Card variant='plain'>
                    <CardHeader>
                        <CardTitle>Top content on your website</CardTitle>
                        <CardDescription>Your highest viewed posts in the last 30 days.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className='w-[60%]'>Post title</TableHead>
                                    <TableHead className='w-[20%]'>Visitors</TableHead>
                                    <TableHead>Views</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {posts.map(post => (
                                    <TableRow key={post.id}>
                                        <TableCell className="font-medium">{post.title}</TableCell>
                                        <TableCell>{formatNumber(post.visitors)}</TableCell>
                                        <TableCell>{formatNumber(post.views)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </section>
        </StatsLayout>
    );
};

export default Web;