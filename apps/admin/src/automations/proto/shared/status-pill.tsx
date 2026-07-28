import React from 'react';
import {Badge} from '@tryghost/shade/components';
import type {RunStatus} from './mock';
import {runStatusMeta} from './member-runs';

// A run's status as a Shade Badge, shared by the dashboard and surface concepts.
// Renders the design-system Badge directly (variant per status in runStatusMeta)
// so the shape and light/dark colors match Storybook exactly. `label` overrides
// the default wording per status — surface uses its own (Running / Stopped)
// without changing the shared labels the dashboard shows.
export const StatusPill: React.FC<{status: RunStatus; label?: string}> = ({status, label}) => {
    const meta = runStatusMeta[status];
    return (
        <Badge className={`font-medium whitespace-nowrap ${meta.className ?? ''}`} variant={meta.variant}>
            {label ?? meta.label}
        </Badge>
    );
};
