import type { GiftDuration, GiftProduct } from '../../../utils/gift-subscriptions';

export type GiftStep = 'plan' | 'delivery';
export type GiftDeliveryMethod = 'email' | 'link';
export type GiftCadenceDuration =
  | { cadence: 'month'; duration: Exclude<GiftDuration, 12> }
  | { cadence: 'year'; duration: 1 };

export interface GiftFormErrors {
  buyerName?: string | null;
  deliveryDate?: string | null;
  email?: string | null;
  recipientEmail?: string | null;
}

export interface GiftInputField {
  errorMessage: string;
  label: string;
  maxLength: number;
  name: string;
  placeholder: string;
  required: boolean;
  type: 'email' | 'text';
  value: string;
}

export type { GiftDuration, GiftProduct };
