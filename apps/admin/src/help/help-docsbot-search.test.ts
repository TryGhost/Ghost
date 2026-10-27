import { describe, expect, it } from 'vitest';
import { toSearchResults } from './help-docsbot-search';
import { article } from './help-fixtures';

describe('toSearchResults', () => {
  const stripe = article('stripe', 'Connecting Stripe');
  const pause = article(
    'how-do-i-pause-member-subscriptions',
    'How do I pause member subscriptions?',
  );
  const cancel = article(
    'how-do-i-cancel-member-subscriptions',
    'How do I cancel member subscriptions',
  );
  const tiers = article('tiers', 'Tiers');
  const index = [stripe, pause, cancel, tiers];
  const hit = (url: string | null) => ({ title: '', url, content: '' });

  it('turns chunks into each article once, best first', () => {
    const results = toSearchResults(
      [
        hit('https://ghost.org/help/stripe/'),
        hit('https://ghost.org/help/stripe/'),
        hit('https://ghost.org/help/how-do-i-pause-member-subscriptions/'),
        hit('https://ghost.org/help/stripe/'),
      ],
      index,
    );
    expect(results.map(({ slug }) => slug)).toEqual([
      'stripe',
      'how-do-i-pause-member-subscriptions',
    ]);
  });

  it('shows at most three, and skips pages that are not articles in the list', () => {
    const results = toSearchResults(
      [
        hit('https://ghost.org/help/topic/faq/'),
        hit('https://stripe.com/docs'),
        hit(null),
        hit('https://ghost.org/help/unknown-article/'),
        hit('https://ghost.org/help/stripe/'),
        hit('https://ghost.org/help/how-do-i-pause-member-subscriptions/'),
        hit('https://ghost.org/help/how-do-i-cancel-member-subscriptions/'),
        hit('https://ghost.org/help/tiers/'),
      ],
      index,
    );
    expect(results.map(({ slug }) => slug)).toEqual([
      'stripe',
      'how-do-i-pause-member-subscriptions',
      'how-do-i-cancel-member-subscriptions',
    ]);
  });
});
