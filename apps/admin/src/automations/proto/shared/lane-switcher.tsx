import React, { useContext, useState } from 'react';
import { useNavigate } from '@tryghost/admin-x-framework';
import { toast } from 'sonner';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Switch,
} from '@tryghost/shade/components';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { ProtoVariantsContext, resolveVariantId } from './proto-variants';
import { useVersionLink } from './use-version-link';
import {
  resetProtoStore,
  setStripeConnected,
  setTierArchived,
  useArchivedTierIds,
  useStripeConnected,
} from './store';
import { LANES, type LaneId, laneLabel, lanePath } from './lanes';

// The lane switcher. Split from lanes.ts, which holds the registry and the
// helpers, so this file only exports a component (react-refresh/only-export-
// components) — the same split proto-variants / proto-variant-switcher makes.

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
 * Any variant slots a lane registers (see proto-variants) still render below, so
 * a lane can keep its own internal A/B without a second control.
 *
 * Resetting the prototype's data lives here too, and nowhere else. It was on the
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
  const ctx = useContext(ProtoVariantsContext);
  const slots = ctx?.slots ?? [];
  const stripeConnected = useStripeConnected();
  const archivedTierIds = useArchivedTierIds();
  const bronzeArchived = archivedTierIds.includes('bronze');

  return (
    <div className={cn('absolute right-4 bottom-4 z-30', className)}>
      <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          {/* Icon only. The pill carried the lane's name so nobody had to wonder
                    which version they were looking at — but the labels grew concept
                    names ("Ph 2: Per-tier") and the pill got louder than the product
                    around it. The name is one click away on the checked row; the
                    aria-label keeps it announced. */}
          <Button
            aria-label={`Prototype lane: ${laneLabel(lane)}`}
            className={cn('text-muted-foreground', open && 'bg-muted')}
            size="icon"
            variant="ghost"
          >
            <LucideIcon.FlaskConical strokeWidth={2} />
          </Button>
        </DropdownMenuTrigger>
        {/* p-2 over the component's own p-1 — this menu is a settings panel more
                than a command list, and the roomier inset is what says so. The
                separators take -mx-2 to match, so the rules still run edge to edge. */}
        <DropdownMenuContent align="end" className="w-64 p-2" side="top">
          {/* The one header this menu kept: it names the whole surface, where the
                    removed ones (Lane, Site) partitioned it. */}
          <DropdownMenuLabel>Prototype settings</DropdownMenuLabel>
          {/* No section headers and no per-lane sub-copy — each row's own words
                    carry what the headers and captions used to (see the LANES comment
                    for how the labels absorbed the notes).

                    Plain items with a trailing check rather than Shade's radio rows:
                    the radio dot sits in a leading gutter, and with it every lane name
                    started 24px in — the same trailing-check treatment the list's view
                    dropdown uses, opacity-toggled so rows keep a stable width. */}
          {LANES.map((entry) => (
            <DropdownMenuItem
              key={entry.id}
              onSelect={() => {
                if (entry.id === lane) {
                  return;
                }
                navigate(toVersioned(lanePath(entry.id)));
              }}
            >
              {entry.label}
              <LucideIcon.Check
                className={cn(
                  'ms-auto text-primary',
                  entry.id === lane ? 'opacity-100' : 'opacity-0',
                )}
              />
            </DropdownMenuItem>
          ))}
          {slots.map((slot) => (
            <React.Fragment key={slot.id}>
              <DropdownMenuSeparator className="-mx-2" />
              <DropdownMenuLabel>{slot.label}</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={resolveVariantId(slot, ctx?.selections ?? {})}
                onValueChange={(variantId) => ctx?.select(slot.id, variantId)}
              >
                {slot.variants.map((variant) => (
                  <DropdownMenuRadioItem key={variant.id} value={variant.id}>
                    {variant.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </React.Fragment>
          ))}
          <DropdownMenuSeparator className="-mx-2" />
          {/* Site state, not lane state — but it belongs in the same menu for the
                    same reason resetting does: it exists because this is a prototype.
                    A reviewer on a preview URL can't disconnect Stripe to see what the
                    automations screens do about it, so this stands in for the site
                    setting.

                    A switch rather than the menu's checkbox row: a check reads as
                    picking an option, and this is a piece of site state at two
                    settings. preventDefault keeps the menu open through the flip, so
                    the list reshaping behind it (paid workflows leaving and
                    returning) is watchable. The Switch is decorative — the row is
                    the control, and a second focusable thing inside a menu item is
                    one tab stop too many. */}
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              setStripeConnected(!stripeConnected);
            }}
          >
            Stripe connected
            <Switch checked={stripeConnected} className="pointer-events-none ml-auto" aria-hidden />
          </DropdownMenuItem>
          {/* One tier's archive state, standing in for the tier settings screen —
                    a single Bronze toggle reaches every display state the archived-tier
                    design has (marked-in-selection, hidden-from-offer, mixed field).
                    Same switch row and same stay-open behaviour as Stripe above, and
                    for the same reason: the "(archived)" markings appearing on the
                    canvas behind the menu are the thing being demoed. */}
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              setTierArchived('bronze', !bronzeArchived);
            }}
          >
            Bronze tier archived
            <Switch checked={bronzeArchived} className="pointer-events-none ml-auto" aria-hidden />
          </DropdownMenuItem>

          <DropdownMenuSeparator className="-mx-2" />
          {/* Resets every lane at once — they share one store. Last, and on its
                    own, because it's the only thing in here that destroys anything. */}
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => {
              resetProtoStore();
              toast.success('Prototype data reset');
            }}
          >
            <LucideIcon.RotateCcw /> Reset prototype
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
