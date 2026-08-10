import React from 'react';
import {LucideIcon, cn} from '@tryghost/shade/utils';

interface FeatureImagePlaceholderProps {
    className?: string;
}

const FeatureImagePlaceholder:React.FC<FeatureImagePlaceholderProps> = ({
    className
}) => {
    return (
        <div className={cn('flex flex-col items-center justify-center gap-1 rounded-sm bg-muted p-6 dark:bg-surface-elevated-2', className)}>
            <LucideIcon.Image className='text-muted-foreground/50' size={18} strokeWidth={1.5} />
        </div>
    );
};

export default FeatureImagePlaceholder;