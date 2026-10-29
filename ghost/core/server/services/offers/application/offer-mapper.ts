import type { ReadonlyDeep } from 'type-fest';
// @ts-expect-error This module lacks type definitions.
import type { Offer } from '../domain/models/offer';

export type OfferDTO = {
  id: string;
  name: string;
  code: string;
  display_title: string;
  display_description: string;
  type: 'percent' | 'fixed' | 'trial';
  cadence: 'month' | 'year';
  amount: number;
  currency_restriction: boolean;
  currency: string | null;
  duration: 'once' | 'repeating' | 'forever' | 'trial';
  duration_in_months: number | null;
  status: 'active' | 'archived';
  redemption_count: number;
  redemption_type: 'signup' | 'retention';
  tier: { id?: string; name?: string } | null;
  created_at: string;
  last_redeemed: string | null;
};

export type PublicOfferDTO = {
  id: string;
  display_title: string;
  display_description: string;
  type: 'percent' | 'fixed' | 'trial';
  cadence: 'month' | 'year';
  amount: number;
  duration: 'once' | 'repeating' | 'forever' | 'trial';
  duration_in_months: number | null;
  currency: string | null;
  status: 'active' | 'archived';
  redemption_type: 'signup' | 'retention';
  tier: { id: string } | null;
};

const getCurrency = (offer: Readonly<Pick<Offer, 'type' | 'currency'>>): string | null => {
  if (offer.type.value === 'fixed') {
    return offer.currency?.value ?? null;
  }
  return null;
};

export class OfferMapper {
  static toDTO(offer: ReadonlyDeep<Offer>): OfferDTO {
    return {
      id: offer.id,
      name: offer.name.value,
      code: offer.code.value,
      display_title: offer.displayTitle.value,
      display_description: offer.displayDescription.value,
      type: offer.type.value,
      cadence: offer.cadence.value,
      amount: offer.amount.value,
      duration: offer.duration.value.type,
      duration_in_months:
        offer.duration.value.type === 'repeating' ? offer.duration.value.months : null,
      currency_restriction: offer.type.value === 'fixed',
      currency: getCurrency(offer),
      status: offer.status.value,
      redemption_count: offer.redemptionCount,
      redemption_type: offer.redemptionType.value,
      tier: offer.tier ? { id: offer.tier.id, name: offer.tier.name } : null,
      created_at: offer.createdAt,
      last_redeemed: offer.lastRedeemed,
    };
  }

  /** Returns a DTO for a public facing offer (e.g. Portal's retention offer UI) */
  static toPublicDTO(offer: ReadonlyDeep<Offer>): PublicOfferDTO {
    return {
      id: offer.id,
      display_title: offer.displayTitle.value,
      display_description: offer.displayDescription.value,
      type: offer.type.value,
      cadence: offer.cadence.value,
      amount: offer.amount.value,
      duration: offer.duration.value.type,
      duration_in_months:
        offer.duration.value.type === 'repeating' ? offer.duration.value.months : null,
      currency: getCurrency(offer),
      status: offer.status.value,
      redemption_type: offer.redemptionType.value,
      tier: offer.tier ? { id: offer.tier.id } : null,
    };
  }
}
