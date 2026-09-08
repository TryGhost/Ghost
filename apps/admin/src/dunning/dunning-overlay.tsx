import { useEffect, useRef } from 'react';
import { Button } from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import type { User } from '@tryghost/admin-x-framework/api/users';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { isOwnerUser } from '@tryghost/admin-x-framework/api/users';
import { useLocation } from '@tryghost/admin-x-framework';
import {
  useDunningState,
  dismissLock,
  dismissLockQuietly,
  markPayNowReturnRoute,
} from './use-dunning-state';
import { useDunningLockTakeover } from './use-dunning-lock-takeover';
import { useOwnerUser } from './use-owner-user';
import { EXPORT_URL, PAY_URL, lockedHeadline, lockedMessage } from './dunning-copy';

/**
 * Who to talk to about the payment. Staff realistically reach the owner
 * however they normally would — so no CTA, just the person.
 */
function OwnerCard({ owner }: { owner: User }) {
  const displayName = owner.name || owner.email;
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <Inline align="center" className="mt-4" gap="md">
      <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-muted text-xl font-semibold text-foreground">
        {initial}
      </div>
      <div className="text-left">
        <div className="text-lg font-bold text-foreground">{displayName} (Owner)</div>
        <Text size="md" tone="secondary">
          {owner.email}
        </Text>
      </div>
    </Inline>
  );
}

/**
 * Full-viewport takeover for the dunning locked phase.
 *
 * Deliberately a painted overlay, not a route lock: the aim is to make the
 * outstanding payment unmissable, not to enforce it — the host suspends the
 * site at `suspendsAt` regardless. It stands down on the billing route so the
 * user can reach the payment form, and it can be dismissed for the session,
 * dropping back to the urgent warning banner.
 */
export function DunningOverlay() {
  const { data: currentUser } = useCurrentUser();
  const state = useDunningState();
  const takeover = useDunningLockTakeover();
  const location = useLocation();
  const isOwner = Boolean(currentUser && isOwnerUser(currentUser));
  // This component mounts on every Admin page; only fetch the user list in
  // the one case that renders the owner card (staff seeing the takeover)
  const owner = useOwnerUser({ enabled: takeover && Boolean(currentUser) && !isOwner });

  // Move keyboard focus into the dialog when it takes over, so keyboard and
  // screen-reader users land on the message rather than the covered page
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (takeover) {
      dialogRef.current?.focus();
    }
  }, [takeover]);

  if (!state || !currentUser || !takeover) {
    return null;
  }

  return (
    <div
      ref={dialogRef}
      aria-labelledby="dunning-overlay-title"
      aria-modal="true"
      className="absolute inset-0 z-[9990] flex items-center justify-center overflow-y-auto bg-background px-10 py-16 outline-hidden"
      data-testid="dunning-overlay"
      role="alertdialog"
      tabIndex={-1}
    >
      {/* Same close treatment as the full-screen Settings view's exit button */}
      <Button
        aria-label="Dismiss"
        className="absolute top-6 right-6 text-muted-foreground hover:text-foreground"
        size="icon"
        title="Dismiss"
        variant="ghost"
        onClick={() => dismissLock(state)}
      >
        <LucideIcon.X className="size-6!" />
      </Button>
      <Stack align="center" className="text-center" gap="lg">
        <div className="flex size-14 items-center justify-center rounded-full bg-state-danger/10">
          <LucideIcon.TriangleAlert className="size-6 text-state-danger" />
        </div>
        <h1
          className="text-3xl font-bold tracking-tight text-foreground"
          id="dunning-overlay-title"
        >
          {lockedHeadline(state.daysLeft)}
        </h1>
        <Text className="max-w-[620px]" leading="relaxed" size="md" tone="secondary">
          {lockedMessage(state, isOwner)}
        </Text>
        {isOwner ? (
          <Inline align="center" className="mt-4" gap="md">
            <Button size="lg" asChild>
              <a
                href={PAY_URL}
                onClick={() => {
                  dismissLockQuietly(state);
                  markPayNowReturnRoute(location.pathname);
                }}
              >
                Pay now
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href={EXPORT_URL}>Download my data</a>
            </Button>
          </Inline>
        ) : (
          owner && <OwnerCard owner={owner} />
        )}
      </Stack>
    </div>
  );
}
