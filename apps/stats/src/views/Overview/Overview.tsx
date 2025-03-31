import Layout from '@src/components/layout';
import React from 'react';
import {H1} from '@tryghost/shade';

const Overview:React.FC = () => {
    return (
        <Layout>
            <header className='flex h-[102px] items-center justify-between px-8'>
                <H1>Stats</H1>
            </header>
        </Layout>
    );
};

export default Overview;