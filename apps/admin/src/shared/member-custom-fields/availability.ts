import type { FeatureLimit } from '@/shared/gates/use-feature-limit';

/**
 * The Labs flag that released custom fields. Every read of it names this constant, so
 * deleting it leaves the type checker listing each one. It goes with the server's flag, once
 * every server Admin talks to has it released and nothing needs to switch it off: until
 * then a server refuses field changes while its flag is off, and Admin must not offer them.
 */
export const CUSTOM_FIELDS_FLAG = 'membersCustomFields';

/**
 * The host limit that can switch custom fields off, a separate question from the flag. While it
 * does, the server reads every field as archived, so only screens that add or change a field
 * ask about it.
 */
export const CUSTOM_FIELDS_LIMIT = 'limitCustomFields' satisfies FeatureLimit;
