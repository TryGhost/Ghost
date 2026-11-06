const FIRST_NAME_HELPER_REGEX = /\{first_name(?:,?\s*"(?:[^"\\]|\\.)*")?\}/g;

function countHelpers(value: unknown): number {
  if (typeof value === 'string') {
    return value.match(FIRST_NAME_HELPER_REGEX)?.length ?? 0;
  }

  if (Array.isArray(value)) {
    return value.reduce<number>((count, child) => count + countHelpers(child), 0);
  }

  if (!value || typeof value !== 'object') {
    return 0;
  }

  // Only the Email card replaces the helper; anywhere else it is sent as typed.
  if ('type' in value && value.type === 'email') {
    return 0;
  }

  return Object.values(value).reduce<number>((count, child) => count + countHelpers(child), 0);
}

/** The `{first_name}` helpers, with or without a fallback, in a lexical body outside Email cards. */
export function countFirstNameOutsideEmailCards(lexical: string | null | undefined): number {
  if (!lexical) {
    return 0;
  }

  try {
    return countHelpers(JSON.parse(lexical));
  } catch {
    return 0;
  }
}
