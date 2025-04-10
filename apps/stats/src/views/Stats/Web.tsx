import Header from '@src/components/layout/Header';
import Kpis from './components/Kpis';
import React from 'react';
import StatsLayout from './layout/StatsLayout';
import {H4, Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@tryghost/shade';
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
                <div>
                    This is filter
                </div>
            </Header>
            <div>
                <Kpis />
            </div>
            <div className='mt-16'>
                <H4>Top content on your website</H4>
                <div className='text-sm text-gray-700'>Your highest viewed posts in the last 30 days.</div>
                <Table className='mt-4'>
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
            </div>
        </StatsLayout>
    );
};

export default Web;