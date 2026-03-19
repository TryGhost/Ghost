import {SettingsService} from '@/helpers/services/settings/settings-service';
import {TiersService} from '@/helpers/services/tiers/tiers-service';
import type {AdminTier, TierCreateInput} from '@/helpers/services/tiers/tiers-service';
import type {HttpClient} from '@/data-factory';

export async function createPaidPortalTier(
    request: HttpClient,
    input: Omit<TierCreateInput, 'visibility'> & Partial<Pick<TierCreateInput, 'visibility'>>
): Promise<AdminTier> {
    const tiersService = new TiersService(request);
    const settingsService = new SettingsService(request);

    const tier = await tiersService.createTier({
        ...input,
        visibility: input.visibility ?? 'public'
    });

    await settingsService.setPortalPlans(['free', 'monthly', 'yearly']);

    return tier;
}
