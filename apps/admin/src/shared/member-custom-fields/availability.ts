import type { FeatureLimit } from '@/shared/gates/use-feature-limit';

/**
 * The Labs flag that releases custom fields. Every read of it names this constant, so
 * deleting it at release leaves the type checker listing each one.
 */
export const CUSTOM_FIELDS_FLAG = 'membersCustomFields';

/**
 * The host limit that can switch custom fields off, a separate question from the flag. While it
 * does, the server reads every field as archived, so only screens that add or change a field
 * ask about it.
 */
export const CUSTOM_FIELDS_LIMIT = 'limitCustomFields' satisfies FeatureLimit;
