import { parseEmailAddress } from '@tryghost/parse-email-address';

/** Compare provider addresses without changing the stored address used for safety writes. */
export function isSameEmailAddress(
  stored: string | null | undefined,
  received: string | undefined,
): boolean {
  if (!stored || !received) {
    return false;
  }
  // Preserve existing comparisons even for addresses the parser cannot normalize.
  if (stored.toLowerCase() === received.toLowerCase()) {
    return true;
  }
  const left = parseEmailAddress(stored);
  const right = parseEmailAddress(received);
  return Boolean(
    left &&
    right &&
    left.local.toLowerCase() === right.local.toLowerCase() &&
    left.domain.toLowerCase() === right.domain.toLowerCase(),
  );
}
