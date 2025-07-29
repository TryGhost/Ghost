import React from 'react';
import {LucideIcon, cn} from '@tryghost/shade';

interface FeatureImagePlaceholderProps {
    className?: string;
}

const FeatureImagePlaceholder:React.FC<FeatureImagePlaceholderProps> = ({
    className
}) => {
    return (
        <div className={cn('rounded-sm bg-muted dark:bg-[#36373a] flex flex-col items-center justify-center gap-1 p-6', className)}>
            <LucideIcon.Image className='text-muted-foreground/50' size={18} strokeWidth={1.5} />
        </div>
    );
};

export default FeatureImagePlaceholder;