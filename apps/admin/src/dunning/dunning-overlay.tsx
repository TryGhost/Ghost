import { useEffect, useRef, useState } from 'react';
import { Button } from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { isOwnerUser } from '@tryghost/admin-x-framework/api/users';
import { useDunningState, markPaymentAttempt } from './use-dunning-state';
import { useDunningLockTakeover } from './use-dunning-lock-takeover';
import { useOwnerUser } from './use-owner-user';
import { EXPORT_URL, PAY_URL, lockedHeadline, lockedMessage } from './dunning-copy';

const EMAIL_COPIED_FEEDBACK_MS = 1500;

function CopyOwnerEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const copyEmail = () => {
    // Clipboard can be unavailable; the email is still shown as text.
    navigator.clipboard.writeText(email).catch(() => {});
    setCopied(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), EMAIL_COPIED_FEEDBACK_MS);
  };

  return (
    <Inline align="center" className="h-11 rounded-md border border-border pr-1.5 pl-4" gap="sm">
      <Text size="md" tone="secondary">
        {email}
      </Text>
      <Button
        aria-label="Copy email address"
        size="icon"
        title="Copy email address"
        variant="ghost"
        onClick={copyEmail}
      >
        {copied ? <LucideIcon.Check className="text-state-success" /> : <LucideIcon.Copy />}
      </Button>
    </Inline>
  );
}

/**
 * Full-viewport takeover for the dunning locked phase.
 *
 * Deliberately a painted overlay, not a route lock: the aim is to make the
 * outstanding payment unmissable, not to enforce it — the host suspends the
 * site at `suspendsAt` regardless. It stands down on the billing route so the
 * user can reach the payment form.
 */
export function DunningOverlay() {
  const { data: currentUser } = useCurrentUser();
  const state = useDunningState();
  const takeover = useDunningLockTakeover();
  const owner = useOwnerUser();

  if (!state || !currentUser || !takeover) {
    return null;
  }

  const isOwner = isOwnerUser(currentUser);

  return (
    <div
      aria-modal="true"
      className="absolute inset-0 z-[9990] flex items-center justify-center overflow-y-auto bg-background px-10 py-16"
      data-testid="dunning-overlay"
      role="alertdialog"
    >
      <Stack align="center" className="text-center" gap="lg">
        <div className="flex size-14 items-center justify-center rounded-full bg-state-danger/10">
          <LucideIcon.TriangleAlert className="size-6 text-state-danger" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {lockedHeadline(state.daysLeft)}
        </h1>
        <Text className="max-w-[620px]" leading="relaxed" size="md" tone="secondary">
          {lockedMessage(state, isOwner)}
        </Text>
        <Text className="max-w-[520px]" size="md" weight="medium">
          Your site is still online for readers.
        </Text>
        <Inline align="center" className="mt-4" gap="md">
          {isOwner ? (
            <>
              <Button size="lg" asChild>
                <a href={PAY_URL} onClick={markPaymentAttempt}>
                  Pay now
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href={EXPORT_URL}>Download my data</a>
              </Button>
            </>
          ) : (
            <>
              {owner?.email && (
                <Button size="lg" asChild>
                  <a href={`mailto:${owner.email}`}>Email the owner</a>
                </Button>
              )}
              {owner?.email && <CopyOwnerEmail email={owner.email} />}
            </>
          )}
        </Inline>
      </Stack>
    </div>
  );
}
