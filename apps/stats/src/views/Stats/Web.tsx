import Header from '@src/components/layout/Header';
import Kpis from './components/Kpis';
import React from 'react';
import StatsLayout from './layout/StatsLayout';
import {H4, Separator} from '@tryghost/shade';

const Web:React.FC = () => {
    return (
        <StatsLayout>
            <Header>Web</Header>
            <div>
                <Kpis />
            </div>
            <div className='mt-10'>
                <H4>Top posts on your website</H4>
                <div className='mt-4 flex flex-col gap-3'>
                    <span>Post 1</span>
                    <Separator />
                    <span>Post 2</span>
                    <Separator />
                    <span>Post 3</span>
                </div>
            </div>
        </StatsLayout>
    );
};

export default Web;