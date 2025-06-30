import React from 'react';
import {cn} from '@tryghost/shade';

interface FeatureImagePlaceholderProps {
    className?: string;
}

const FeatureImagePlaceholder:React.FC<FeatureImagePlaceholderProps> = ({
    className
}) => {
    return (
        <div className={cn('rounded-sm bg-muted dark:bg-[#36373a] flex flex-col items-stretch justify-center gap-1', className)}>
            <div className='flex flex-col items-stretch gap-[5px] px-[15%]'>
                <div className='h-[3px] bg-muted-foreground/20'></div>
                <div className='h-[3px] w-[80%] bg-muted-foreground/20'></div>
                <div className='h-[3px] w-[90%] bg-muted-foreground/20'></div>
            </div>
        </div>
    );
};

export default FeatureImagePlaceholder;