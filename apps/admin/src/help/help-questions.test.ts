import { describe, expect, it } from 'vitest';
import { article } from './help-fixtures';
import type { HelpPageKey } from './help-pages';
import {
  findRelatedArticles,
  getFaqQuestions,
  getPageRelevance,
  isQuestion,
} from './help-questions';

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

describe('findRelatedArticles', () => {
  const articles = [
    faq('cancel', 'How do I cancel member subscriptions'),
    faq('pause', 'How do I pause member subscriptions?'),
    faq('sign-in', 'How do members sign in to my site?'),
    faq('fees', 'Are there any transaction fees?'),
    faq('welcome', 'How do I send a welcome email to new members?'),
    article('stripe', 'Setting up Stripe payments', 'Connect Stripe to take member subscriptions', [
      'Payments',
    ]),
    article('fees-guide', 'Understanding transaction fees', 'What Stripe charges per payment', [
      'Payments',
    ]),
  ];
  const slugs = (text: string, page: HelpPageKey | null = null) =>
    findRelatedArticles(articles, text, page).map(({ slug }) => slug);

  it('relates the articles sharing the most words that carry meaning', () => {
    expect(slugs('I want to pause a subscription')).toEqual(['pause', 'cancel']);
    expect(slugs('stripe payments')).toEqual(['stripe', 'fees-guide']);
  });

  it('puts FAQ answers before articles sharing as many words', () => {
    expect(slugs('transaction fees')).toEqual(['fees', 'fees-guide']);
    expect(slugs('stripe member subscriptions').slice(0, 3)).toEqual(['cancel', 'pause', 'stripe']);
  });

  it('finds a word in its other forms', () => {
    expect(slugs('cancelling')).toEqual(['cancel']);
    expect(slugs('members').sort()).toEqual(['cancel', 'pause', 'sign-in', 'welcome']);
  });

  it('counts a word found only in the excerpt as half of one', () => {
    expect(slugs('charges')).toEqual([]);
    expect(slugs('stripe charges')).toEqual(['stripe', 'fees-guide']);
  });

  it('relates nothing to words that say nothing about the question', () => {
    expect(slugs('how do I')).toEqual([]);
    expect(slugs('')).toEqual([]);
  });

  it('needs two shared words once the message is long', () => {
    expect(slugs('the images in my newsletter do not load in gmail')).toEqual([]);
    expect(slugs('members cannot sign in to my site since the move')).toEqual(['sign-in']);
  });

  it('puts articles about the page first among equals', () => {
    const onMembers = article('import', 'How do I import members?', '', ['FAQ'], ['members']);
    const related = findRelatedArticles([...articles, onMembers], 'members', 'members');
    expect(related[0]?.slug).toBe('import');
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
