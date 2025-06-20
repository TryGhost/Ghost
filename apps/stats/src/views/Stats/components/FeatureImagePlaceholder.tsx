import React from 'react';
import {cn} from '@tryghost/shade';

interface FeatureImagePlaceholderProps {
    className?: string;
}

const FeatureImagePlaceholder:React.FC<FeatureImagePlaceholderProps> = ({
    className
}) => {
    return (
        <div className={cn('rounded-sm bg-muted flex flex-col items-stretch justify-center p-4 py-1 gap-1', className)}>
            <div className='h-5 rounded-[2px] bg-muted-foreground/20'></div>
            <div className='flex flex-col items-stretch gap-0.5'>
                <div className='h-1 rounded-[2px] bg-muted-foreground/20'></div>
                <div className='h-1 w-2/3 rounded-[2px] bg-muted-foreground/20'></div>
            </div>
        </div>
    );
};

export default FeatureImagePlaceholder;