/**
 * Turns an email segment NQL filter into the phrase Ghost shows a user, e.g.
 * "All subscribers", "Paid subscribers", "Labels: VIP, Founder".
 *
 * Ported from `apps/ember-admin/app/helpers/humanize-recipient-filter.js`.
 * Like the original, this only understands the limited set of filters the
 * publishing UI can produce, and falls back to the raw filter for anything
 * else rather than guessing.
 */

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function pluralLabel(word: string, count: number): string {
  return count === 1 ? word : `${word}s`;
}

function extractList(filter: string, key: string): string[] | null {
  const arrayMatch = new RegExp(`${key}s:\\[(.*?)\\]`).exec(filter);

  if (arrayMatch) {
    return arrayMatch[1].split(',');
  }

  const singleMatches = [...filter.matchAll(new RegExp(`${key}:(.*?)(?:,|$)`, 'g'))]
    .map(([, value]) => value)
    .filter(Boolean);

  return singleMatches.length ? singleMatches : null;
}

export function humanizeRecipientFilter(filter = ''): string {
  const parts = filter.split(',');

  if (parts.includes('status:free') && parts.includes('status:-free')) {
    return 'All subscribers';
  }

  const output: string[] = [];

  if (parts.includes('status:free')) {
    output.push('Free subscribers');
  } else if (parts.includes('status:-free')) {
    output.push('Paid subscribers');
  }

  const labels = extractList(filter, 'label');
  if (labels) {
    output.push(`${pluralLabel('Label', labels.length)}: ${labels.map(capitalize).join(', ')}`);
  }

  const products = extractList(filter, 'product');
  if (products) {
    output.push(
      `${pluralLabel('Product', products.length)}: ${products.map(capitalize).join(', ')}`,
    );
  }

  return output.length ? output.join(' & ') : filter;
}
