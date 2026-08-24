import { type Tier } from '@tryghost/admin-x-framework/api/tiers';

export interface TierCadenceOption {
  label: string;
  value: string;
}

export const getTiersCadences = (tiers: Tier[]): TierCadenceOption[] => {
  const cadences: TierCadenceOption[] = [];

  tiers.forEach((tier: Tier) => {
    // Offers only target cadences the tier actually sells
    const availableCadences = tier.available_cadences || 'all';

    if (availableCadences !== 'year') {
      cadences.push({
        label: `${tier.name} - Monthly`,
        value: `${tier.id}-month-${tier.currency}`,
      });
    }

    if (availableCadences !== 'month') {
      cadences.push({
        label: `${tier.name} - Yearly`,
        value: `${tier.id}-year-${tier.currency}`,
      });
    }
  });

  return cadences;
};
