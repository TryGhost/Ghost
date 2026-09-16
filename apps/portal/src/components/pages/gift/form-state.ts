import { GIFT_DURATION_CATALOGUE } from '../../../utils/gift-subscriptions';
import type { GiftDeliveryMethod, GiftDuration } from './types';
import { removeSessionStorageState } from '../../../utils/use-session-storage-state';

export const GIFT_FORM_STATE_KEY = 'ghost-portal-gift-form-state';
export const GIFT_EMAIL_MAX_LENGTH = 191;
export const GIFT_NAME_MAX_LENGTH = 191;
export const GIFT_MESSAGE_MAX_LENGTH = 250;

export type GiftDeliveryTiming = { type: 'immediate' } | { type: 'scheduled'; date: string };

export interface GiftFormState {
  version: 1;
  plan: {
    selectedDuration: GiftDuration | null;
    selectedProductId: string | null;
    buyerEmail: string;
    buyerName: string;
    completed: boolean;
  };
  delivery: {
    method: GiftDeliveryMethod;
    emailDraft: {
      recipientEmail: string;
      recipientName: string;
      message: string;
      timing: GiftDeliveryTiming;
    };
  };
}

export function createGiftFormState({
  buyerName = '',
}: { buyerName?: string } = {}): GiftFormState {
  return {
    version: 1,
    plan: {
      selectedDuration: null,
      selectedProductId: null,
      buyerEmail: '',
      buyerName,
      completed: false,
    },
    delivery: {
      method: 'email',
      emailDraft: {
        recipientEmail: '',
        recipientName: '',
        message: '',
        timing: { type: 'immediate' },
      },
    },
  };
}

function isBoundedString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.length <= maxLength;
}

export function parseGiftFormState(value: unknown): GiftFormState | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<GiftFormState>;
  const plan = candidate.plan;
  const delivery = candidate.delivery;
  const emailDraft = delivery?.emailDraft;
  const timing = emailDraft?.timing;
  const validDuration =
    plan?.selectedDuration === null ||
    GIFT_DURATION_CATALOGUE.includes(plan?.selectedDuration as GiftDuration);
  const validTiming =
    timing?.type === 'immediate' ||
    (timing?.type === 'scheduled' && typeof timing.date === 'string');

  if (
    candidate.version !== 1 ||
    !plan ||
    !delivery ||
    !emailDraft ||
    !validDuration ||
    !(plan.selectedProductId === null || typeof plan.selectedProductId === 'string') ||
    !isBoundedString(plan.buyerEmail, GIFT_EMAIL_MAX_LENGTH) ||
    !isBoundedString(plan.buyerName, GIFT_NAME_MAX_LENGTH) ||
    typeof plan.completed !== 'boolean' ||
    !['email', 'link'].includes(delivery.method) ||
    !isBoundedString(emailDraft.recipientEmail, GIFT_EMAIL_MAX_LENGTH) ||
    !isBoundedString(emailDraft.recipientName, GIFT_NAME_MAX_LENGTH) ||
    !isBoundedString(emailDraft.message, GIFT_MESSAGE_MAX_LENGTH) ||
    !validTiming
  ) {
    return null;
  }

  return candidate as GiftFormState;
}

export function clearGiftFormState() {
  removeSessionStorageState({ key: GIFT_FORM_STATE_KEY });
}
