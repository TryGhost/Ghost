import React from 'react';
import {Button, LucideIcon} from '@tryghost/shade';
import {STATS_DEFAULT_RANGE_KEY, STATS_RANGE_OPTIONS} from '@src/utils/constants';
import {useGlobalData} from '@src/providers/GlobalDataProvider';

const EmptyStatView:React.FC = () => {
    const {setRange, setAudience} = useGlobalData();

    return (
        <div className='flex min-h-[40vh] flex-col items-center justify-center gap-4 text-gray-700'>
            <div className='flex size-14 max-h-14 max-w-14 items-center justify-center rounded-full bg-gray-100'>
                <LucideIcon.ChartScatter size={20} />
            </div>
            No stats available for this filter.
            <Button className='text-black' variant='outline' onClick={() => {
                setRange(STATS_RANGE_OPTIONS[STATS_DEFAULT_RANGE_KEY].value);
                setAudience(7);
            }}>View all stats</Button>
        </div>
    );
};

export default EmptyStatView;