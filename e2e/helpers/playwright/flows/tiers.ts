import {SettingsService} from '@/helpers/services/settings/settings-service';
import {TiersService} from '@/helpers/services/tiers/tiers-service';
import type {AdminTier, TierCreateInput} from '@/helpers/services/tiers/tiers-service';
import type {HttpClient} from '@/data-factory';
import type {StripeTestService} from '@/helpers/services/stripe';

export async function createPaidPortalTier(
    request: HttpClient,
    input: Omit<TierCreateInput, 'visibility'> & Partial<Pick<TierCreateInput, 'visibility'>>,
    opts?: {stripe?: StripeTestService}
): Promise<AdminTier> {
    const tiersService = new TiersService(request);
    const settingsService = new SettingsService(request);

    const tier = await tiersService.createTier({
        ...input,
        visibility: input.visibility ?? 'public'
    });

    await settingsService.setPortalPlans(['free', 'monthly', 'yearly']);

    if (!opts?.stripe) {
        return tier;
    }

    // Tier creation returns before Ghost's async Stripe sync has finished.
    // Stripe-backed tests that immediately use paid signup links need to wait
    // until the product and prices exist in the fake Stripe state.
    const timeoutMs = 10000;
    const intervalMs = 250;
    const startTime = Date.now();

    while ((Date.now() - startTime) < timeoutMs) {
        const product = opts.stripe.getProducts().find(item => item.name === tier.name);
        const syncedPrices = product
            ? opts.stripe.getPrices().filter(item => item.product === product.id).length
            : 0;

        if (syncedPrices === 2) {
            return tier;
        }

        await new Promise<void>((resolve) => {
            setTimeout(resolve, intervalMs);
        });
    }

    throw new Error(`Timed out waiting for Stripe sync for tier ${tier.name}`);
}
