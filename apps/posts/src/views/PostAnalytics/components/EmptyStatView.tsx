import React from 'react';
import {LucideIcon} from '@tryghost/shade';

const EmptyStatView:React.FC = () => {
    return (
        <div className="flex h-full flex-col items-center justify-center gap-4 text-gray-700 transition-colors duration-150 ease-in-out dark:text-gray-300">
            <div className="bg-gray-100 flex size-18 items-center justify-center rounded-full transition-colors duration-150 ease-in-out dark:bg-gray-800">
                <LucideIcon.ChartScatter size={24} strokeWidth={1.5} />
            </div>
            No stats available for this filter.
        </div>
    );
};

export default EmptyStatView;