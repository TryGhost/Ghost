import React from 'react';
import type {AutomationDetail} from '@tryghost/admin-x-framework/api/automations';

// The automations list's active/inactive pill, shared by every proto concept
// that lists real AutomationDetail records (surface, dashboard). Distinct from
// the real production AutomationStatusBadge
// (automations/components/automation-status-badge.tsx) — this proto version is
// still being iterated on (labels/colors) rather than adopted from the real one.
export const StatusBadge: React.FC<{status: AutomationDetail['status']}> = ({status}) => (
    status === 'active'
        ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green/20 px-2 py-0.5 text-xs font-medium text-green uppercase">
                <span className="size-1.5 rounded-full bg-green" />
                On
            </span>
        )
        : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground uppercase">
                Off
            </span>
        )
);
