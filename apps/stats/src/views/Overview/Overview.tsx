import Content from './components/Content';
import Kpis from './components/Kpis';
import Layout from '@src/components/layout';
import Locations from './components/Locations';
import React from 'react';
import Sources from './components/Sources';
import Technical from './components/Technical';
import {H1} from '@tryghost/shade';

const Overview:React.FC = () => {
    return (
        <Layout>
            <header className='flex h-[102px] items-center justify-between px-8'>
                <H1>Stats</H1>
            </header>
            <div className='grid grid-cols-2 gap-8 px-8 pb-8'>
                <Kpis />
                <Content />
                <Sources />
                <Locations />
                <Technical />
            </div>
        </Layout>
    );
};

export default Overview;