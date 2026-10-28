import { describe, expect, it } from 'vitest';
import { article } from './help-fixtures';
import { getFaqQuestions, getPageRelevance, isQuestion, matchQuestions } from './help-questions';

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

describe('matchQuestions', () => {
  const questions = [
    faq('cancel', 'How do I cancel member subscriptions'),
    faq('pause', 'How do I pause member subscriptions?'),
    faq('sign-in', 'How do members sign in to my site?'),
    faq('fees', 'Are there any transaction fees?'),
    faq('welcome', 'How do I send a welcome email to new members?'),
  ];
  const slugs = (draft: string) => matchQuestions(questions, draft).map(({ slug }) => slug);

  it('completes what was typed, word by word, with half-typed words', () => {
    expect(slugs('how do i canc')).toEqual(['cancel']);
    expect(slugs('member sub')).toEqual(['cancel', 'pause']);
  });

  it('puts questions that start the same way first', () => {
    expect(slugs('how do i')).toEqual(['cancel', 'pause', 'welcome', 'sign-in']);
    expect(slugs('fees')).toEqual(['fees']);
  });

  it('needs a few characters and more than half of the meaningful words to match', () => {
    expect(slugs('ho')).toEqual([]);
    expect(slugs('cancel stripe')).toEqual([]);
    // From three words on, one that isn't in a question doesn't lose it
    expect(slugs('cancel member stripe')).toEqual(['cancel']);
    expect(slugs('cancel stripe payments now')).toEqual([]);
  });

  it('keeps completing as the user types around the words that matter', () => {
    expect(slugs('how do i cancel a member')).toEqual(['cancel']);
    expect(slugs('how can i get my members to sign in')).toEqual(['sign-in']);
  });

  it('puts questions about the page first', () => {
    // On Automations, the welcome email leads; on Members, the member ones do
    const onPage = (draft: string, page: 'automations' | 'members') =>
      matchQuestions(questions, draft, page).map(({ slug }) => slug);
    expect(onPage('how do i', 'automations')).toEqual(['welcome', 'cancel', 'pause', 'sign-in']);
    expect(onPage('how do i', 'members')[0]).toBe('cancel');
    expect(onPage('how do i', 'members')).not.toContain('fees');
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
