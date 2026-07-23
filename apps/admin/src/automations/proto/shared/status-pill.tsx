import React from 'react';
import type {RunStatus} from './mock';
import {runStatusMeta} from './member-runs';

// A run's status as a rounded pill, shared by the dashboard and surface concepts.
export const StatusPill: React.FC<{status: RunStatus}> = ({status}) => (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap uppercase ${runStatusMeta[status].pill}`}>
        {runStatusMeta[status].label}
    </span>
);
