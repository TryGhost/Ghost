import { useState } from 'react';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { decideDunningIntervention } from '@tryghost/admin-x-framework/utils/dunning-intervention';
import { isOwnerUser } from '@tryghost/admin-x-framework/api/users';
import type { UserRoleType } from '@tryghost/admin-x-framework/api/roles';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@tryghost/shade/components';
import { LucideIcon, formatNumber } from '@tryghost/shade/utils';
import { useEmberRouting, useSubscriptionStatus } from './ember-bridge';
import { navigateTo } from './utils/navigation';

const DUNNING_MODAL_COPY = {
  owner: {
    title: 'Your payment has failed',
    description:
      'Update your payment details to pay the outstanding balance on your account and avoid canceling your subscription. Your site is still online.',
  },
  staff: {
    title: 'This site’s billing needs attention',
    description:
      'Ask the site owner to update the payment details to avoid canceling the subscription. The site is still online.',
  },
} as const;

interface DunningModalProps {
  currentUser: {
    roles: Array<{ name: UserRoleType }>;
  };
}

function getTitle(
  copyVariant: 'owner-counted' | 'owner-generic' | 'staff',
  paymentAttempts: number | null,
): string {
  if (copyVariant === 'staff') {
    return DUNNING_MODAL_COPY.staff.title;
  }

  if (copyVariant === 'owner-counted' && paymentAttempts !== null) {
    const attemptLabel = paymentAttempts === 1 ? 'time' : 'times';
    return `${DUNNING_MODAL_COPY.owner.title} ${formatNumber(paymentAttempts)} ${attemptLabel}`;
  }

  return DUNNING_MODAL_COPY.owner.title;
}

export function DunningModal({ currentUser }: DunningModalProps) {
  const { data: configData } = useBrowseConfig();
  const subscriptionState = useSubscriptionStatus();
  const { isRouteActive } = useEmberRouting();
  const [dismissed, setDismissed] = useState(false);
  const audience = isOwnerUser(currentUser) ? 'owner' : 'staff';
  const forceUpgrade = subscriptionState?.subscription?.forceUpgrade === true;
  const decision = decideDunningIntervention({
    isGrace: subscriptionState?.isGrace,
    paymentAttempts: subscriptionState?.subscription?.paymentAttempts,
    forceUpgrade,
    audience,
    modalDismissed: dismissed,
  });

  const billingEnabled = configData?.config.hostSettings?.billing?.enabled === true;
  const billingOwnsModal = !forceUpgrade && isRouteActive('pro');

  if (!billingEnabled || billingOwnsModal || !decision.copyVariant) {
    return null;
  }

  const title = getTitle(decision.copyVariant, decision.visiblePaymentAttempts);
  const description = DUNNING_MODAL_COPY[audience].description;

  const dismiss = () => setDismissed(true);
  const openBilling = () => {
    dismiss();
    navigateTo('/pro');
  };

  return (
    <Dialog
      open={decision.reminderModalVisible}
      onOpenChange={(open) => {
        if (!open) {
          dismiss();
        }
      }}
    >
      <DialogContent onPointerDownOutside={(event) => event.preventDefault()}>
        <Button
          aria-label="Close"
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
          size="icon"
          type="button"
          variant="ghost"
          onClick={dismiss}
        >
          <LucideIcon.X />
        </Button>
        <DialogHeader className="pr-8">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={dismiss}>
            Dismiss for now
          </Button>
          {decision.showBillingAction && (
            <Button type="button" onClick={openBilling}>
              Update payment details
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
