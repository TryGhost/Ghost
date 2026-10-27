import { describe, expect, it } from 'vitest';
import { article } from './help-fixtures';
import { getFaqQuestions, isQuestion, matchQuestions, wantsSupport } from './help-questions';

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

  it('needs a few characters and every word to match', () => {
    expect(slugs('ho')).toEqual([]);
    expect(slugs('cancel stripe')).toEqual([]);
  });
});

describe('wantsSupport', () => {
  it('spots a request for a person', () => {
    expect(wantsSupport('Can I talk to a human?')).toBe(true);
    expect(wantsSupport('I want to contact support')).toBe(true);
    expect(wantsSupport('how do I reach the support team')).toBe(true);
    expect(wantsSupport('please open a ticket for me')).toBe(true);
  });

  it('leaves questions about the product alone', () => {
    expect(wantsSupport('How do I email my members?')).toBe(false);
    expect(wantsSupport('What permissions do staff users have?')).toBe(false);
    expect(wantsSupport('Does Ghost support webhooks?')).toBe(false);
  });
});
