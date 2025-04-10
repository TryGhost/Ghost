import Header from '@src/components/layout/Header';
import Kpis from './components/Kpis';
import React from 'react';
import StatsLayout from './layout/StatsLayout';

const Web:React.FC = () => {
    return (
        <StatsLayout>
            <Header>Web</Header>
            <div>
                <Kpis />
            </div>
        </StatsLayout>
    );
};

export default Web;