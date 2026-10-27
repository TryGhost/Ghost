/*
 * Small wording helpers the Help panel shares. English only for now: the
 * production version should use t() (see the internationalization guide).
 */

/** "1 article", "3 articles". */
export function plural(count: number, word: string, words = `${word}s`) {
  return `${count} ${count === 1 ? word : words}`;
}

/** "today", "tomorrow", "in 3 days". */
export function inDays(days: number) {
  if (days <= 0) {
    return 'today';
  }
  return days === 1 ? 'tomorrow' : `in ${days} days`;
}

/** "Jamie Larson" → "JL", for an avatar without a photo. */
export function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('');
}
