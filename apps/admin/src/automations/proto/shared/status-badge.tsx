import React from 'react';
import type { AutomationDetail } from '@tryghost/admin-x-framework/api/automations';

// The automations list's active/inactive pill, shared by every proto concept
// that lists real AutomationDetail records (surface, dashboard). Distinct from
// the real production AutomationStatusBadge
// (automations/components/automation-status-badge.tsx) — this proto version is
// still being iterated on (labels/colors) rather than adopted from the real one.
//
// Colour is the one deliberate divergence from production: green-600 in light
// rather than the shared green-500, on both the label and the dot. 500 sits at
// L74.8%, which barely reads against the pale /20 fill; 800 clears contrast but
// goes muddy at this size, so 600 is the stop that holds. The dot moves with the
// label — leaving it at 500 made it glow next to darker text. Dark keeps 500
// throughout, which was never the problem. Production has the same weakness; if
// this holds up in review it's a fix for the real badge too.
export const StatusBadge: React.FC<{ status: AutomationDetail['status'] }> = ({ status }) =>
  status === 'active' ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-green/20 px-2 py-0.5 text-xs font-medium text-green-600 uppercase dark:text-green">
      <span className="size-1.5 rounded-full bg-green-600 dark:bg-green" />
      On
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground uppercase">
      Off
    </span>
  );
