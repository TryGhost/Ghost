import Header from '@src/components/layout/Header';
import React from 'react';
import StatsLayout from './layout/StatsLayout';

const Locations:React.FC = () => {
    return (
        <StatsLayout>
            <Header>Locations</Header>
            <div>
                Locations
            </div>
        </StatsLayout>
    );
};

export default Locations;