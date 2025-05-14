import React from 'react';
import {Button, LucideIcon} from '@tryghost/shade';
import {STATS_DEFAULT_RANGE_KEY, STATS_RANGE_OPTIONS} from '@src/utils/constants';
import {useGlobalData} from '@src/providers/GlobalDataProvider';

const EmptyStatView:React.FC = () => {
    const {setRange, setAudience} = useGlobalData();

    return (
        <div className='flex h-full flex-col items-center justify-center gap-4 rounded-lg border text-gray-700'>
            <div className='-mt-10 flex size-18 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-950'>
                <LucideIcon.ChartScatter size={24} strokeWidth={1.5} />
            </div>
            No stats available for this filter.
            <Button className='text-foreground' variant='outline' onClick={() => {
                setRange(STATS_RANGE_OPTIONS[STATS_DEFAULT_RANGE_KEY].value);
                setAudience(7);
            }}>View all stats</Button>
        </div>
    );
};

export default EmptyStatView;