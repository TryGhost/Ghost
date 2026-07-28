import React from 'react';
import {Badge} from '@tryghost/shade/components';
import type {RunStatus} from './mock';
import {runStatusMeta} from './member-runs';

// A run's status as a Shade Badge, shared by the dashboard and surface concepts.
// Renders the design-system Badge directly (variant per status in runStatusMeta)
// so the shape and light/dark colors match Storybook exactly.
export const StatusPill: React.FC<{status: RunStatus}> = ({status}) => {
    const {label, variant, className} = runStatusMeta[status];
    return (
        <Badge className={`font-medium whitespace-nowrap ${className ?? ''}`} variant={variant}>
            {label}
        </Badge>
    );
};
