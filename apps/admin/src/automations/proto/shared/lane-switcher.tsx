import React, { useEffect, useState } from 'react';
import { useNavigate } from '@tryghost/admin-x-framework';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
  Field,
  FieldLabel,
  FieldLegend,
  FieldSet,
  Popover,
  PopoverContent,
  PopoverTrigger,
  RadioGroup,
  RadioGroupItem,
  Separator,
} from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { useVersionLink } from './use-version-link';
import { resetLabels } from './labels';
import { resetSegments } from './segments';
import {
  resetProtoStore,
  setStripeConnected,
  setTierArchived,
  useArchivedTierIds,
  useStripeConnected,
} from './store';
import { LANES, type LaneId, type LaneStatus, laneLabel, lanePath } from './lanes';
import {
  RECORDING_MODE_SHORTCUT,
  isRecordingModeShortcut,
  toggleRecordingMode,
  useRecordingMode,
} from './recording-mode';

// The lane switcher. Split from lanes.ts, which holds the registry and the
// helpers, so this file only exports a component (react-refresh/only-export-
// components) — the same split proto-variants / proto-variant-switcher makes.

// A lane's status, as the badge beside its name: Shade's success badge for
// done, its warning (amber) one for in progress.
//
// Both texts are darkened in light mode. The badges set mid-tone text on a tint
// of the same hue (green-500, yellow-600), which is barely legible at this
// size; the 700 step is the same kind of override the run-status badges take
// (shared/member-runs). The palette doesn't flip, so dark mode keeps each
// badge's own colour.
const LANE_STATUS_BADGE: Record<
  LaneStatus,
  { label: string; variant: 'success' | 'warning'; className?: string }
> = {
  done: { label: 'Done', variant: 'success', className: 'text-green-700 dark:text-green' },
  'in-progress': {
    label: 'WIP',
    variant: 'warning',
    className: 'text-yellow-700 dark:text-yellow-600',
  },
};

/**
 * The corner control: which lane you're in, and the way to the others.
 *
 * It carries its lane's name rather than being a bare icon. The whole point of
 * the split is that nobody has to wonder which version they're looking at, and a
 * flask on its own answers that only once you've clicked it.
 *
 * Switching lanes goes to the lane's LIST, never to the same automation in
 * another lane. The lanes disagree about what an automation screen even is, and
 * landing mid-flow in a different one reads as the screen having changed under
 * you — which is the confusion this whole structure exists to remove.
 *
 * A settings panel, not a command list — so it's a Popover of Shade's own form
 * controls (RadioGroup, Switch, Button) rather than a menu dressed up as one.
 * As a dropdown menu the lanes were menu radio rows, which draw no ring, and
 * the two site switches were decorative copies inside menu items.
 *
 * It used to list a lane's variant slots too (see proto-variants). Nothing
 * mounts that provider any more, so the rows never rendered; they're gone from
 * here and in the branch history if a lane wants an internal A/B again.
 *
 * Resetting the prototype's data lives here too (in the header's ⋯ menu), and
 * nowhere else. It was on the
 * automations list's own ⋯ for a while, which put a control that exists only
 * because this is a prototype among controls that are the product — a reviewer
 * had no way to tell that one row of that menu wasn't a feature. Everything in
 * this menu is admittedly scaffolding, which is exactly where scaffolding
 * belongs.
 */
export const LaneSwitcher: React.FC<{ lane: LaneId; className?: string }> = ({
  lane,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const toVersioned = useVersionLink();
  const stripeConnected = useStripeConnected();
  const archivedTierIds = useArchivedTierIds();
  const bronzeArchived = archivedTierIds.includes('bronze');

  // Recording mode — see shared/recording-mode. It no longer hides this
  // control (the beaker hides itself now, always — see the hot corner below);
  // it only changes what else is on screen, today the sidebar. The shortcut is
  // listened for here because this is on every prototype screen.
  const recording = useRecordingMode();
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isRecordingModeShortcut(event)) {
        event.preventDefault();
        toggleRecordingMode();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const reset = () => {
    resetProtoStore();
    // Labels and segments are their own stores (see shared/labels,
    // shared/segments) but the same prototype data — a reset that left a site's
    // invented labels and segments behind would be a partial one.
    resetLabels();
    resetSegments();
    setOpen(false);
    toast.success('Prototype data reset');
  };

  return (
    // The hot corner. The beaker is scaffolding, so it stays out of sight until
    // it's wanted: this 64px square in the bottom-right corner is the hover
    // target, and the button inside it fades in while the pointer is over the
    // square, while it has keyboard focus, or while its panel is open. Kept
    // small because it sits over the screen and takes the clicks that land on
    // it.
    <div
      className={cn(
        'group/proto absolute right-0 bottom-0 z-30 flex size-16 items-end justify-end p-4',
        className,
      )}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {/* Icon only. The lane's name is one click away on the checked row;
              the aria-label keeps it announced. */}
          <Button
            aria-label={`Prototype lane: ${laneLabel(lane)}`}
            className={cn(
              'text-muted-foreground opacity-0 transition-opacity group-hover/proto:opacity-100 focus-visible:opacity-100 motion-reduce:transition-none',
              open && 'bg-muted opacity-100',
            )}
            size="icon"
            type="button"
            variant="ghost"
          >
            <LucideIcon.FlaskConical strokeWidth={2} />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-96" side="top">
          <Stack gap="lg">
            {/* The title names the whole surface; the ⋯ beside it holds the two
                things that act on the prototype as a whole rather than set
                something in it. Reset clears every lane at once — they share
                one store. Record mode dresses the screen for a recording; the
                row says which way pressing it goes, with its shortcut. */}
            <Inline align="center" justify="between">
              <Text size="md" weight="semibold">
                Prototype
              </Text>
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button aria-label="Prototype actions" size="icon" type="button" variant="ghost">
                    <LucideIcon.MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={reset}>
                    <LucideIcon.RotateCcw /> Reset prototype
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={toggleRecordingMode}>
                    <LucideIcon.Video />
                    {recording ? 'Disable record mode' : 'Enable record mode'}
                    <DropdownMenuShortcut>{RECORDING_MODE_SHORTCUT}</DropdownMenuShortcut>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </Inline>
            {/* The lanes: one is always the one you're in. Each carries its
                status as a badge (see LANE_STATUS_BADGE). Switching goes to the
                lane's list. */}
            <RadioGroup
              aria-label="Prototype lane"
              value={lane}
              onValueChange={(next) => {
                if (next !== lane) {
                  navigate(toVersioned(lanePath(next as LaneId)));
                }
              }}
            >
              {LANES.map((entry) => (
                <Field key={entry.id} orientation="horizontal">
                  <RadioGroupItem id={`proto-lane-${entry.id}`} value={entry.id} />
                  <FieldLabel htmlFor={`proto-lane-${entry.id}`}>{entry.label}</FieldLabel>
                  <Badge
                    className={LANE_STATUS_BADGE[entry.status].className}
                    variant={LANE_STATUS_BADGE[entry.status].variant}
                  >
                    {LANE_STATUS_BADGE[entry.status].label}
                  </Badge>
                </Field>
              ))}
            </RadioGroup>
            <Separator />
            {/* Site state, not lane state — here because, like reset, it exists
                only because this is a prototype. A reviewer on a preview URL
                can't disconnect Stripe to see what the automations screens do
                about it, so this stands in for the site setting. The panel
                stays open through a flip, so the screen reshaping behind it is
                watchable. */}
            {/* Shade's FieldSet + legend: the two are one group of conditions the
                prototype can be put under, and the legend names it. Checkboxes
                rather than switches — each is a condition that holds or doesn't. */}
            <FieldSet className="gap-3">
              <FieldLegend variant="label">Conditions</FieldLegend>
              <Field orientation="horizontal">
                <Checkbox
                  checked={stripeConnected}
                  id="proto-stripe-connected"
                  onCheckedChange={(checked) => setStripeConnected(checked === true)}
                />
                <FieldLabel htmlFor="proto-stripe-connected">Stripe connected</FieldLabel>
              </Field>
              {/* One tier's archive state, standing in for the tier settings
                  screen — a single Bronze toggle reaches every display state
                  the archived-tier design has. */}
              <Field orientation="horizontal">
                <Checkbox
                  checked={bronzeArchived}
                  id="proto-bronze-archived"
                  onCheckedChange={(checked) => setTierArchived('bronze', checked === true)}
                />
                <FieldLabel htmlFor="proto-bronze-archived">Bronze tier archived</FieldLabel>
              </Field>
            </FieldSet>
          </Stack>
        </PopoverContent>
      </Popover>
    </div>
  );
};
