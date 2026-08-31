import { APIError } from '@tryghost/admin-x-framework/errors';
import { type Tier } from '@tryghost/admin-x-framework/api/tiers';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { checkStripeEnabled } from '@tryghost/admin-x-framework/api/settings';
import { useBrowseTiersCheckoutConfig } from '@tryghost/admin-x-framework/api/tiers-checkout-config';
import { useGlobalData } from '@/settings/providers/global-data-context';

/**
 * The gate and the data for a tier's checkout collection, in one place.
 *
 * With the membersCustomFields flag or Stripe off, nothing is fetched and the tier modal
 * renders exactly as it did before. The card itself additionally needs a paid tier —
 * saved, or in the middle of being created.
 * When the card is due, `isReady` lets the modal defer its first paint until the
 * configuration is loaded — the same rule it already applies to the tier itself — so the
 * card never grows after it appears.
 *
 * A failed read makes the checkout section unavailable, never the modal: an Admin can run
 * against a Core without this endpoint (the flag alone is not a compatibility check), and
 * a transient failure has to degrade the same way. There is no toast, because nothing
 * here is actionable for the publisher — but the two failures read differently: a 404 is
 * the feature not existing on this Core, so the card is simply absent, while any other
 * settled failure is a load problem with the feature present, and `failed` lets the modal
 * say so instead of silently looking like collection is off.
 */
export const useTierCheckoutCollection = (
  tier: Tier | undefined,
  { creating = false }: { creating?: boolean } = {},
) => {
  const hasCustomFields = useFeatureFlag('membersCustomFields');
  const { config: globalConfig, settings } = useGlobalData();

  // The read is tier-independent — one browse covers every tier — so it hangs only on
  // the feature being on. That lets the tiers list warm it before any modal opens, and
  // means a free-tier or new-tier modal costs at most one cached request.
  const fetchWanted = hasCustomFields && checkStripeEnabled(settings || [], globalConfig || {});
  const { data, error, isError, isFetching } = useBrowseTiersCheckoutConfig({
    enabled: fetchWanted,
    defaultErrorHandler: false,
  });

  // The card shows for a saved paid tier, and during creation — a new tier is paid by
  // definition, and its configuration is held locally until the create supplies the id
  // to save it against, the same conditions under which the price inputs show.
  const sectionWanted = fetchWanted && (tier ? tier.type !== 'free' : creating);

  // Settled failure only: while a refetch after an earlier error is in flight the section
  // is pending, not unavailable, so a card that is about to load holds the modal's paint
  // instead of popping in after it.
  const failed = isError && !isFetching;
  const missingBackend = failed && error instanceof APIError && error.response?.status === 404;

  const enabled = sectionWanted && !failed;

  return {
    enabled,
    failed: sectionWanted && failed && !missingBackend,
    isReady: !enabled || Boolean(data),
    // The extra `?.` guards a malformed success response: the section degrades to its
    // empty state instead of the modal crashing on a missing array.
    config: data?.tiers_checkout_config?.find((entry) => entry.tier_id === tier?.id),
  };
};
