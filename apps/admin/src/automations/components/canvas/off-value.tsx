import React from 'react';
import {cn} from '@tryghost/shade/utils';

export const TRACKING_OFF_MESSAGE = 'Tracking is off in Analytics settings.';

export const OffValue: React.FC<{
    className?: string;
}> = ({className}) => (
    <span className={cn('text-muted-foreground', className)}>
        <span aria-hidden='true'>Off</span>
        <span className='sr-only'>{TRACKING_OFF_MESSAGE}</span>
    </span>
);
