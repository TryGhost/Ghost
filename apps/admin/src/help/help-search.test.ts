import { describe, expect, it } from 'vitest';
import { article } from './help-fixtures';
import { getSearchTerms, isAboutAccount, rankHelpArticles } from './help-search';

describe('getSearchTerms', () => {
  it('keeps the words that carry the question', () => {
    expect(getSearchTerms('Why didn’t my scheduled post publish?')).toEqual([
      'scheduled',
      'post',
      'publish',
    ]);
  });
});

describe('rankHelpArticles', () => {
  const homepage = article('build-a-custom-homepage', 'How do I build a custom homepage?');
  const domain = article('using-custom-domains', 'Adding a custom domain');
  const scheduling = article('publishing-content', 'Publishing and scheduling', '', ['Publishing']);
  const redirects = article('redirects', 'Redirects', 'Send visitors from an old URL', [
    'Advanced',
  ]);
  const postSettings = article('post-settings', 'Post settings', 'Change a post’s URL', [
    'Publishing',
  ]);

  it('puts the article matching the most words first', () => {
    const terms = getSearchTerms('How do I build a custom homepage?');
    expect(rankHelpArticles([domain, homepage], terms, null)[0]).toBe(homepage);
  });

  it('drops articles with only a word in common', () => {
    const terms = getSearchTerms('How do I build a custom homepage?');
    expect(rankHelpArticles([domain, homepage], terms, null)).toEqual([homepage]);
  });

  it('matches word forms', () => {
    const terms = getSearchTerms('scheduled');
    expect(rankHelpArticles([scheduling], terms, null)).toEqual([scheduling]);
  });

  it('lifts articles about the page the user is on', () => {
    const terms = getSearchTerms('url');
    expect(
      rankHelpArticles([redirects, postSettings], terms, {
        key: 'editor',
        topics: ['publishing'],
      })[0],
    ).toBe(postSettings);
    expect(
      rankHelpArticles([postSettings, redirects], terms, {
        key: 'settings',
        topics: ['advanced'],
      })[0],
    ).toBe(redirects);
  });

  it('lifts articles the help center tagged for the page', () => {
    const terms = getSearchTerms('url');
    const tagged = article('redirects', 'Redirects', 'Old URL', ['Advanced'], ['editor']);
    expect(
      rankHelpArticles([postSettings, tagged], terms, { key: 'editor', topics: ['design'] })[0],
    ).toBe(tagged);
  });

  it('only lifts articles whose main topic is the page’s', () => {
    const giftLinks = article('gift-links', 'Gift links', 'Share a post', [
      'Payments',
      'Analytics',
    ]);
    const postAnalytics = article('post-analytics', 'Post analytics', 'Share a post', [
      'Analytics',
    ]);
    const terms = getSearchTerms('share post');
    expect(
      rankHelpArticles([giftLinks, postAnalytics], terms, {
        key: 'analytics',
        topics: ['analytics'],
      })[0],
    ).toBe(postAnalytics);
  });

  it('finds nothing for unrelated words', () => {
    expect(rankHelpArticles([homepage, domain], getSearchTerms('pizza'), null)).toEqual([]);
  });
});

describe('names people split or run together', () => {
  it('finds GoDaddy for "go daddy"', () => {
    const godaddy = article('godaddy', 'GoDaddy domain setup', '', ['Ghost(Pro)']);
    const promotions = article('promotions', 'Why does my email go to the promotions tab?');
    const terms = getSearchTerms('go daddy');
    expect(rankHelpArticles([promotions, godaddy], terms, null)).toEqual([godaddy]);
  });

  it('doesn’t match short words inside others', () => {
    const design = article('design', 'Design settings');
    expect(rankHelpArticles([design], getSearchTerms('sign'), null)).toEqual([]);
  });
});

describe('follow-ups', () => {
  const portal = article('portal', 'Customize Portal', '', ['Memberships']);
  const stripe = article('customizing-stripe', 'Customizing Stripe', '', ['Payments']);
  const followUp = {
    query: 'how to connect stripe',
    terms: getSearchTerms('how to connect stripe'),
    topic: 'payments',
  };

  it('lean on the question before', () => {
    const terms = getSearchTerms('how do I customize it');
    expect(rankHelpArticles([portal, stripe], terms, null)[0]).toBe(portal);
    expect(rankHelpArticles([portal, stripe], terms, null, followUp)[0]).toBe(stripe);
  });

  it('find the article in either spelling', () => {
    const terms = getSearchTerms('how to customise it');
    expect(rankHelpArticles([portal, stripe], terms, null, followUp)[0]).toBe(stripe);
  });

  it('never answer on the question before alone', () => {
    expect(rankHelpArticles([portal, stripe], getSearchTerms('pizza'), null, followUp)).toEqual([]);
  });
});

describe('account questions', () => {
  const memberCancel = article(
    'how-do-i-cancel-member-subscriptions',
    'How do I cancel member subscriptions',
    'Member subscriptions can be cancelled from within your Stripe account.',
    ['FAQ'],
  );
  const autoRenew = article(
    'turn-off-auto-renew',
    'How do I turn off auto-renew for my Ghost(Pro) subscription?',
    'You need to have an active subscription for your site and account to keep your site online.',
    ['Ghost(Pro)'],
  );
  const pause = article(
    'pause-ghost-pro-subscription',
    'Can I pause my Ghost(Pro) subscription and publication?',
    'An active subscription is required to keep your site online, but you can cancel your account any time.',
    ['Ghost(Pro)'],
  );
  const all = [memberCancel, autoRenew, pause];

  it('are about the user’s own Ghost(Pro) account, unless they mention members', () => {
    expect(isAboutAccount(getSearchTerms('how do I cancel my account'))).toBe(true);
    expect(isAboutAccount(getSearchTerms('downgrade my plan'))).toBe(true);
    expect(isAboutAccount(getSearchTerms('cancel a member’s subscription'))).toBe(false);
    expect(isAboutAccount(getSearchTerms('customize my theme'))).toBe(false);
  });

  it('lead with Ghost(Pro) articles', () => {
    for (const question of [
      'how do I cancel my account',
      'how do I cancel',
      'cancel my subscription',
    ]) {
      expect(rankHelpArticles(all, getSearchTerms(question), null)[0]?.tags[0]?.name).toBe(
        'Ghost(Pro)',
      );
    }
  });

  it('leave members’ subscriptions to the member article', () => {
    const terms = getSearchTerms('how do I cancel a member’s subscription');
    expect(rankHelpArticles(all, terms, null)[0]).toBe(memberCancel);
  });
});

describe('matches in the opening of an article', () => {
  it('find platforms only named in an article’s text, as the help center’s search does', () => {
    const importMembers = article(
      'import-members',
      'Import members',
      'Migrate members.',
      ['Memberships'],
      [],
      {
        searchText: 'We have guides for migrating from Substack, Mailchimp, Beehiiv and Kit.',
      },
    );
    const other = article('other', 'Other article', 'Nothing about it.');
    expect(rankHelpArticles([other, importMembers], getSearchTerms('beehiiv'), null)).toEqual([
      importMembers,
    ]);
  });
});

describe('reviewed regressions', () => {
  it('lifts Ghost(Pro) articles only when an account word matches them', () => {
    const password = article('reset-password', 'How do I reset or change my password?', '', [
      'Ghost(Pro)',
    ]);
    const plans = article('plans', 'How are staff users calculated on Ghost(Pro) plans?', '', [
      'Ghost(Pro)',
    ]);
    expect(
      rankHelpArticles([password, plans], getSearchTerms('how do I change my plan'), null)[0],
    ).toBe(plans);
  });

  it('treats questions about tiers and offers as about members', () => {
    expect(isAboutAccount(getSearchTerms('change the price of my tiers'))).toBe(false);
  });

  it('needs half the question’s words to match, so one ordinary word in common isn’t an answer', () => {
    const businessModel = article(
      'how-ghost-makes-money',
      'How does Ghost make money?',
      'We think a product people love pays for itself.',
    );
    expect(rankHelpArticles([businessModel], getSearchTerms('I think I got hacked'), null)).toEqual(
      [],
    );
    expect(
      rankHelpArticles([businessModel], getSearchTerms('how does ghost make money'), null),
    ).toEqual([businessModel]);
  });

  it('spells -ise words the help center’s way, at the end of the word', () => {
    const visualizing = article('visualizing', 'Visualizing your audience');
    expect(rankHelpArticles([visualizing], getSearchTerms('visualise my audience'), null)).toEqual([
      visualizing,
    ]);
  });
});
