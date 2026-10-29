import { describe, expect, it } from 'vitest';
import type { HelpArticle } from './help-center';
import { article } from './help-fixtures';
import { getFaqQuestions, getPageRelevance, isQuestion, nudgeFaqForward } from './help-questions';

const faq = (slug: string, title: string) => article(slug, title, '', ['FAQ']);

describe('getFaqQuestions', () => {
  it('keeps FAQ articles whose titles are questions', () => {
    const questions = getFaqQuestions([
      faq('cancel', 'How do I cancel member subscriptions'),
      faq('fees', 'Are there any transaction fees?'),
      faq('robots', 'Modifying robots.txt'),
      article('stripe', 'Does Stripe work?', '', ['Payments']),
    ]);
    expect(questions.map(({ slug }) => slug)).toEqual(['cancel', 'fees']);
  });

  it('reads a question mark or a question word as a question', () => {
    expect(isQuestion('Where can I find my RSS feed?')).toBe(true);
    expect(isQuestion('Can I use Ghost for Ecommerce?')).toBe(true);
    expect(isQuestion('Importing Content to Ghost')).toBe(false);
  });
});

describe('nudgeFaqForward', () => {
  const stripe = article('stripe', 'Setting up Stripe payments', '', ['Payments']);
  const tiers = article('tiers', 'Setting up tiers', '', ['Payments']);
  const pause = faq('pause', 'How do I pause member subscriptions?');
  const slugs = (articles: HelpArticle[]) => nudgeFaqForward(articles).map(({ slug }) => slug);

  it('moves an FAQ answer ahead of the one article above it', () => {
    expect(slugs([stripe, pause, tiers])).toEqual(['pause', 'stripe', 'tiers']);
  });

  it('does not move it past two', () => {
    expect(slugs([stripe, tiers, pause])).toEqual(['stripe', 'pause', 'tiers']);
  });

  it('keeps the order otherwise', () => {
    expect(slugs([pause, stripe, tiers])).toEqual(['pause', 'stripe', 'tiers']);
    expect(slugs([stripe, tiers])).toEqual(['stripe', 'tiers']);
  });
});

describe('getPageRelevance', () => {
  it('rates the page’s own questions above ones that mention the page, above the rest', () => {
    const own = faq('members-sign-in', 'How do members sign in to my site?');
    const tagged = article('tagged', 'How do I moderate?', '', ['FAQ'], ['members']);
    const mentions = faq('receipts', 'How do I send receipts to my paid members?');
    const other = faq('fees', 'Are there any transaction fees?');
    expect(getPageRelevance(own, 'members')).toBe(2);
    expect(getPageRelevance(tagged, 'members')).toBe(2);
    expect(getPageRelevance(mentions, 'members')).toBe(1);
    expect(getPageRelevance(other, 'members')).toBe(0);
    expect(getPageRelevance(own, null)).toBe(0);
  });
});
