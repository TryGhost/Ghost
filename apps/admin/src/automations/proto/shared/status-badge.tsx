import React from 'react';
import type { AutomationDetail } from '@tryghost/admin-x-framework/api/automations';

// The automations list's active/inactive pill, shared by every proto concept that
// lists real AutomationDetail records (surface, dashboard). Distinct from the real
// production AutomationStatusBadge
// (automations/components/automation-status-badge.tsx) only in colour now — this
// proto version is still being iterated on there.
//
// "Live", not "On", following production. It says more: an automation that is live
// is enrolling members right now, which is the thing you scan a list for. The proto
// had drifted to On/Off, which then disagreed with the detail screen's own control
// once that control became the readout as well — the same fact under two names.
//
// Colour is the one deliberate divergence from production: green-600 in light
// rather than the shared green-500, on both the label and the dot. 500 sits at
// L74.8%, which barely reads against the pale /20 fill; 800 clears contrast but
// goes muddy at this size, so 600 is the stop that holds. The dot moves with the
// label — leaving it at 500 made it glow next to darker text. Dark keeps 500
// throughout, which was never the problem. Production has the same weakness; if
// this holds up in review it's a fix for the real badge too.
// `archived` wins over the status when both are set. An archived automation is
// always off (see setAutomationArchived), so there's no live/archived combination to
// resolve — but "Off" on an archived row would answer the less interesting of the two
// questions. The same muted pill as Off, because archiving is not a state to raise a
// hand about; only the word changes.
export const StatusBadge: React.FC<{
  status: AutomationDetail['status'];
  archived?: boolean;
}> = ({ status, archived = false }) =>
  archived ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground uppercase">
      Archived
    </span>
  ) : status === 'active' ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-green/20 px-2 py-0.5 text-xs font-medium text-green-600 uppercase dark:text-green">
      <span className="size-1.5 rounded-full bg-green-600 dark:bg-green" />
      Live
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground uppercase">
      Off
    </span>
  );
