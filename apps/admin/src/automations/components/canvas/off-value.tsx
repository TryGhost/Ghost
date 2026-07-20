// The "tracking off" value — a muted "Off" shown where a metric would show a
// number but tracking is disabled (distinct from `—`, which means "no data yet").
// Inert and presentational: the visible "Off" is aria-hidden and paired with a
// visually-hidden status sentence so screen readers get the full meaning. Any
// hover explanation is composed by the consumer.
import React from 'react';
import {cn} from '@tryghost/shade/utils';

export const OffValue: React.FC<{
    className?: string;
}> = ({className}) => (
    <span className={cn('text-muted-foreground', className)}>
        <span aria-hidden='true'>Off</span>
        <span className='sr-only'>Tracking is off in Analytics settings.</span>
    </span>
);
