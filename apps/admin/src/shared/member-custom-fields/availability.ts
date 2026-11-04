import type { FeatureLimit } from '@/shared/gates/use-feature-limit';

/**
 * The host limit that can switch custom fields off. While it does, the server reads every
 * field as archived, so only screens that add or change a field ask about it.
 */
export const CUSTOM_FIELDS_LIMIT = 'limitCustomFields' satisfies FeatureLimit;
