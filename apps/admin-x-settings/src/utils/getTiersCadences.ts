import {SelectOption} from '@tryghost/admin-x-design-system';
import {Tier} from '@tryghost/admin-x-framework/api/tiers';

export const getTiersCadences = (tiers: Tier[]): SelectOption[] => {
    const cadences: SelectOption[] = [];

    tiers.forEach((tier: Tier) => {
        cadences.push({
            label: `${tier.name} - Monthly`,
            value: `${tier.id}-month-${tier.currency}`
        });

        cadences.push({
            label: `${tier.name} - Yearly`,
            value: `${tier.id}-year-${tier.currency}`
        });
    });

    return cadences;
};
