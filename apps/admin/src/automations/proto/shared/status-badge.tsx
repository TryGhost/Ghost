import React from 'react';
import { Indicator } from '@tryghost/shade/components';
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
      {/* The same dot as Off. Both are automations that aren't running, and the word
                beside it is what separates "stopped" from "put away" — a third mark would
                be signalling a difference the badge already states. */}
      <Indicator className="bg-muted-foreground opacity-50" state="idle" variant="neutral" />
      Archived
    </span>
  ) : status === 'active' ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-green/20 px-2 py-0.5 text-xs font-medium text-green-600 uppercase dark:text-green">
      {/* Shade's Indicator on `active`, which is the pulsing state. The pulse is the
                point: this is the only status in the list that's still happening, and a
                list you scan should be able to say which rows are working without being
                read.

                The colour is overridden rather than taken from the variant. `success`
                resolves to --state-success, which is green-500 — the exact value the note
                above says barely reads against this pill's own /20 fill. The component
                supplies the shape and the animation; the contrast work stands. */}
      <Indicator className="bg-green-600 dark:bg-green" state="active" variant="success" />
      Live
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground uppercase">
      {/* Filled and still. It was briefly the hollow `inactive` ring, on the argument
                that off is the absence of activity — but two marks that differ by being
                hollow and solid read as two kinds of thing, and these are one kind at two
                settings. Solid in both, and only the Live one moves.

                bg-muted-foreground over the variant's own bg-muted, which is gray-100 —
                the same grey as this pill's fill, so the dot would be invisible.

                Then halved, because at full strength it was the loudest thing in the pill:
                gray-700 on a gray-100 fill is 34 points of lightness, more separation than
                the label itself has. Opacity rather than a lighter grey, for two reasons.
                It's Shade's own disabled treatment, which is exactly what this should look
                like. And it composites toward whatever the pill is filled with, so it gets
                dark mode right for free — a fixed light grey would be softer than the label
                in light and brighter than it in dark, which is the wrong way round. */}
      <Indicator className="bg-muted-foreground opacity-50" state="idle" variant="neutral" />
      Off
    </span>
  );
