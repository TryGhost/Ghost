import DateRangeSelect from './components/DateRangeSelect';
import Header from '@src/components/layout/Header';
import React from 'react';
import StatsLayout from './layout/StatsLayout';
import WebKpis from './components/WebKpis';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@tryghost/shade';
import {DEFAULT_RANGE_KEY, RANGE_OPTIONS} from '@src/utils/constants';
import {useGlobalData} from '@src/providers/GlobalDataProvider';

const Web:React.FC = () => {
    const {range} = useGlobalData();

    // const posts = [
    //     {
    //         id: 1,
    //         title: 'Top 3D printing secrets',
    //         visitors: 8099,
    //         views: 12875
    //     },
    //     {
    //         id: 2,
    //         title: 'Endless summer rusty dancemoves the scenic route captain\'s table',
    //         visitors: 7536,
    //         views: 9746
    //     },
    //     {
    //         id: 3,
    //         title: 'Three months in Asia the road less travelled whale shark diving vacation mood',
    //         visitors: 6735,
    //         views: 9644
    //     },
    //     {
    //         id: 4,
    //         title: 'Minimal & Functional Desk Setup in Arizona',
    //         visitors: 5036,
    //         views: 8730
    //     }
    // ];

    return (
        <StatsLayout>
            <Header>
                Web
                <DateRangeSelect />
            </Header>
            <section className='grid grid-cols-1 gap-8'>
                <Card variant='plain'>
                    <CardContent>
                        <WebKpis range={isNaN(range) ? RANGE_OPTIONS[DEFAULT_RANGE_KEY].value : range} />
                    </CardContent>
                </Card>
                <Card variant='plain'>
                    <CardHeader>
                        <CardTitle>Top content on your website</CardTitle>
                        <CardDescription>Your highest viewed posts in the last 30 days.</CardDescription>
                    </CardHeader>
                    <CardContent className='py-20 text-center text-gray-500'>
                        Top posts table
                        {/* <Table>
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
                        </Table> */}
                    </CardContent>
                </Card>
            </section>
        </StatsLayout>
    );
};

export default Web;
