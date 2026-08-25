export type DunningAudience = 'owner' | 'staff';
export type DunningCopyVariant = 'owner-counted' | 'owner-generic' | 'staff';

export interface DunningInterventionInput {
  isGrace: unknown;
  paymentAttempts: unknown;
  forceUpgrade: boolean;
  audience: DunningAudience;
  modalDismissed: boolean;
}

export interface DunningInterventionDecision {
  reminderModalVisible: boolean;
  copyVariant: DunningCopyVariant | null;
  visiblePaymentAttempts: number | null;
  showBillingAction: boolean;
}

function getVisiblePaymentAttempts(
  paymentAttempts: unknown,
  audience: DunningAudience,
): number | null {
  if (audience !== 'owner') {
    return null;
  }

  if (!Number.isSafeInteger(paymentAttempts) || (paymentAttempts as number) <= 0) {
    return null;
  }

  return paymentAttempts as number;
}

export function decideDunningIntervention({
  isGrace,
  paymentAttempts,
  forceUpgrade,
  audience,
  modalDismissed,
}: DunningInterventionInput): DunningInterventionDecision {
  if (isGrace !== true) {
    return {
      reminderModalVisible: false,
      copyVariant: null,
      visiblePaymentAttempts: null,
      showBillingAction: false,
    };
  }

  const visiblePaymentAttempts = getVisiblePaymentAttempts(paymentAttempts, audience);
  const copyVariant =
    audience === 'staff'
      ? 'staff'
      : visiblePaymentAttempts === null
        ? 'owner-generic'
        : 'owner-counted';
  const reminderModalVisible = !forceUpgrade && !modalDismissed;

  return {
    reminderModalVisible,
    copyVariant,
    visiblePaymentAttempts,
    showBillingAction: reminderModalVisible && audience === 'owner',
  };
}
