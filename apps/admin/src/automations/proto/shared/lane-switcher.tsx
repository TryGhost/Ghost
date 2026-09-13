import React, { useContext, useState } from 'react';
import { useNavigate } from '@tryghost/admin-x-framework';
import { toast } from 'sonner';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@tryghost/shade/components';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { ProtoVariantsContext, resolveVariantId } from './proto-variants';
import { useVersionLink } from './use-version-link';
import { resetProtoStore, setStripeConnected, useStripeConnected } from './store';
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

  return (
    <div className={cn('absolute right-4 bottom-4 z-30', className)}>
      <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={`Prototype lane: ${laneLabel(lane)}`}
            className={cn('text-muted-foreground', open && 'bg-muted')}
            variant="ghost"
          >
            <LucideIcon.FlaskConical strokeWidth={2} />
            {laneLabel(lane)}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64" side="top">
          <DropdownMenuLabel>Lane</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={lane}
            onValueChange={(next) => {
              if (next === lane) {
                return;
              }
              navigate(toVersioned(lanePath(next as LaneId)));
            }}
          >
            {LANES.map((entry) => (
              <DropdownMenuRadioItem key={entry.id} className="items-start" value={entry.id}>
                <span className="flex flex-col">
                  <span>{entry.label}</span>
                  <span className="text-xs text-muted-foreground">{entry.note}</span>
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          {slots.map((slot) => (
            <React.Fragment key={slot.id}>
              <DropdownMenuSeparator />
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
          <DropdownMenuSeparator />
          {/* Site state, not lane state — but it belongs in the same menu for the
                    same reason resetting does: it exists because this is a prototype.
                    A reviewer on a preview URL can't disconnect Stripe to see what the
                    automations screens do about it, so the toggle stands in for the
                    site setting. */}
          <DropdownMenuLabel>Site</DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={stripeConnected}
            onCheckedChange={(checked) => setStripeConnected(checked)}
          >
            Stripe connected
          </DropdownMenuCheckboxItem>

          <DropdownMenuSeparator />
          {/* Resets every lane at once — they share one store. Last, and on its
                    own, because it's the only thing in here that destroys anything. */}
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => {
              resetProtoStore();
              toast.success('Prototype data reset');
            }}
          >
            <LucideIcon.RotateCcw /> Reset prototype data
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
