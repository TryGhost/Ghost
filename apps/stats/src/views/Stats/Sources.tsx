import DateRangeSelect from './components/DateRangeSelect';
import Header from '@src/components/layout/Header';
import React from 'react';
import StatsLayout from './layout/StatsLayout';
import {useGlobalData} from '@src/providers/GlobalDataProvider';

const Sources:React.FC = () => {
    const {range} = useGlobalData();

    return (
        <StatsLayout>
            <Header>
                Sources
                <DateRangeSelect />
            </Header>
            <div>
                Sources
                {range}
            </div>
        </StatsLayout>
    );
};

export default Sources;
