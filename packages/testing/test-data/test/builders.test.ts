import {
  analyticsKpi,
  analyticsLocation,
  automation,
  buildLexical,
  buildLexicalParagraph,
  comment,
  commentThread,
  defaultThemesResponse,
  label,
  member,
  newsletterBasicStat,
  newsletterClickStat,
  newsletterSubscriberStat,
  newsletterSubscriberValue,
  post,
  postGrowthStat,
  postStats,
  reply,
  subscriptionStat,
  tag,
  theme,
  tier,
  topPostStat,
  topPostViewsStat,
} from '../src/index';
import type { AnalyticsKpi, RequiredBuilderInput } from '../src/index';
import { describe, expect, expectTypeOf, it } from 'vitest';

describe('builders', () => {
  it('builds fully-populated entities with overrides winning', () => {
    const built = tag({ name: 'News', visibility: 'internal' });

    expect(built.name).toBe('News');
    expect(built.visibility).toBe('internal');
    expect(built.id).toMatch(/^[0-9a-f]{24}$/);
    expect(built.slug).toBeTruthy();
  });

  it('builds posts in the API response shape', () => {
    const built = post({ status: 'published', published_at: '2026-01-02T03:04:05.000Z' });

    expect(built.status).toBe('published');
    expect(built.published_at).toBe('2026-01-02T03:04:05.000Z');
    expect(built.id).toMatch(/^[0-9a-f]{24}$/);
    expect(built.slug).toContain(built.title.split(' ')[0].toLowerCase());
    expect(built.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(built.mobiledoc).toBeNull();
    expect(built.email_segment).toBe('all');

    const lexical = JSON.parse(built.lexical as string) as {
      root: { children: Array<{ type: string }> };
    };
    expect(lexical.root.children[0].type).toBe('paragraph');
    expect(built.html).toMatch(/^<p>/);
    expect(built.plaintext).toBeTruthy();
  });

  it('builds lexical documents from paragraphs and card specs', () => {
    const paragraphDoc = JSON.parse(buildLexicalParagraph('Hello')) as {
      root: { type: string; children: Array<{ type: string; children: Array<{ text: string }> }> };
    };
    expect(paragraphDoc.root.type).toBe('root');
    expect(paragraphDoc.root.children[0].type).toBe('paragraph');
    expect(paragraphDoc.root.children[0].children[0].text).toBe('Hello');

    const cardDoc = JSON.parse(buildLexical({ transistor: { accentColor: '#FF0000' } })) as {
      root: { children: Array<{ type: string; accentColor?: string }> };
    };
    expect(cardDoc.root.children.map((child) => child.type)).toEqual([
      'paragraph',
      'transistor',
      'paragraph',
    ]);
    expect(cardDoc.root.children[1].accentColor).toBe('#FF0000');

    expect(() => buildLexical('no-such-card')).toThrow(/Unknown card type/);
  });

  it('attaches label entities to members', () => {
    const vip = label({ name: 'VIP' });
    const built = member({ name: 'Alice Alpha', labels: [vip] });

    expect(built.labels).toEqual([vip]);
    expect(built.email).toContain('@');
    expect(member.many([{ name: 'A' }, { name: 'B' }]).map((m) => m.name)).toEqual(['A', 'B']);
  });

  it("builds n entities with fresh defaults from many's count form", () => {
    const built = tag.many(3);

    expect(built).toHaveLength(3);
    expect(new Set(built.map((t) => t.id)).size).toBe(3);
    expect(new Set(built.map((t) => t.slug)).size).toBe(3);

    const named = tag.many(3, (index) => ({ name: `Tag ${index + 1}` }));
    expect(named.map((t) => t.name)).toEqual(['Tag 1', 'Tag 2', 'Tag 3']);
  });

  it('builds paid tiers', () => {
    const built = tier({ name: 'Silver Tier' });

    expect(built).toMatchObject({ name: 'Silver Tier', type: 'paid', active: true });
    expect(built.slug).toBeTruthy();
  });

  it('builds automations', () => {
    expect(automation({ status: 'active' }).status).toBe('active');
    expect(automation().slug).toBeTruthy();
  });

  it('builds typed analytics rows with overrides', () => {
    const kpis = analyticsKpi.many([
      { date: '2026-07-28', visits: 100 },
      { date: '2026-07-29', visits: 150 },
    ]);

    expect(kpis).toMatchObject([
      { date: '2026-07-28', visits: 100, pageviews: 0 },
      { date: '2026-07-29', visits: 150, pageviews: 0 },
    ]);
    expect(analyticsLocation({ location: 'GB', visits: 42 })).toEqual({
      location: 'GB',
      visits: 42,
    });
    expect(postGrowthStat({ post_id: 'post-id', free_members: 3 })).toMatchObject({
      post_id: 'post-id',
      free_members: 3,
      paid_members: 0,
    });
    expect(
      newsletterBasicStat({
        post_id: 'post-id',
        post_title: 'Weekly digest',
        send_date: '2026-07-29',
        sent_to: 1000,
      }),
    ).toEqual({
      post_id: 'post-id',
      post_title: 'Weekly digest',
      send_date: '2026-07-29',
      sent_to: 1000,
      total_opens: 0,
      open_rate: 0,
    });
    expect(
      newsletterClickStat({ post_id: 'post-id', email_count: 1000, total_clicks: 60 }),
    ).toEqual({
      post_id: 'post-id',
      email_count: 1000,
      total_clicks: 60,
      click_rate: 0.06,
    });

    const topPost = topPostStat({
      post_id: 'post-id',
      attribution_url: '/post/',
      attribution_type: 'post',
      attribution_id: 'post-id',
      published_at: '2026-07-29',
    });
    expect(topPost).toMatchObject({
      post_id: 'post-id',
      attribution_id: 'post-id',
      attribution_type: 'post',
      title: 'Analytics post',
    });
  });

  it('requires contextual fields while defaulting incidental analytics values', () => {
    expectTypeOf<Parameters<typeof analyticsKpi>[0]>().toEqualTypeOf<
      RequiredBuilderInput<AnalyticsKpi, 'date'>
    >();
    expect(analyticsKpi({ date: '2026-07-29' })).toEqual({
      date: '2026-07-29',
      visits: 0,
      pageviews: 0,
      bounce_rate: 0,
      avg_session_sec: 0,
    });

    expect(
      newsletterBasicStat({
        post_id: 'post-id',
        send_date: '2026-07-29',
        sent_to: 1000,
        total_opens: 400,
      }),
    ).toMatchObject({ open_rate: 0.4 });
    expect(
      newsletterBasicStat({
        post_id: 'post-id',
        send_date: '2026-07-29',
        sent_to: 1000,
        total_clicks: 60,
      }),
    ).toMatchObject({ total_clicks: 60, click_rate: 0.06 });

    expect(
      topPostViewsStat({
        post_id: 'post-id',
        published_at: '2026-07-29',
        sent_count: 1000,
        opened_count: 400,
        clicked_count: 60,
        free_members: 3,
        paid_members: 2,
      }),
    ).toMatchObject({ members: 5, open_rate: 40, click_rate: 6, title: 'Analytics post' });

    const values = newsletterSubscriberValue.many([
      { date: '2026-07-28', value: 10 },
      { date: '2026-07-29', value: 12 },
    ]);
    expect(newsletterSubscriberStat({ total: 12, values })).toEqual({ total: 12, values });

    expect(
      postStats({
        id: 'post-id',
        recipient_count: 1000,
        opened_count: 400,
        free_members: 10,
        paid_members: 2,
      }),
    ).toMatchObject({ open_rate: 40, member_delta: 12 });

    expect(
      subscriptionStat({
        date: '2026-07-29',
        tier: 'tier-id',
        cadence: 'month',
      }),
    ).toMatchObject({ count: 0, signups: 0, cancellations: 0 });
  });

  it('builds comments with linked member and post embeds', () => {
    const built = comment({ html: '<p>Hello</p>' });

    expect(built.html).toBe('<p>Hello</p>');
    expect(built.member_id).toBe(built.member.id);
    expect(built.post_id).toBe(built.post.id);
    expect(built.status).toBe('published');
    expect(built.parent_id).toBeNull();
    expect(built.count.direct_replies).toBe(0);
  });

  it('builds flat comment threads with reply linkage and counts derived', () => {
    const thread = commentThread('Root comment', [reply('First reply', ['Nested reply']), reply()]);

    expect(thread).toHaveLength(4);
    const [root, first, nested, second] = thread;
    expect(thread.root).toBe(root);
    expect(thread.all).toBe(thread);
    expect(root.html).toBe('<p>Root comment</p>');
    expect(first.html).toBe('<p>First reply</p>');

    for (const descendant of [first, nested, second]) {
      expect(descendant.parent_id).toBe(root.id);
      expect(descendant.post_id).toBe(root.post_id);
      expect(descendant.post).toEqual(root.post);
    }

    expect(first.in_reply_to_id).toBe(root.id);
    expect(first.in_reply_to_snippet).toBe('Root comment');
    expect(nested.in_reply_to_id).toBe(first.id);
    expect(nested.in_reply_to_snippet).toBe('First reply');
    expect(second.in_reply_to_id).toBe(root.id);

    expect(root.count).toMatchObject({ replies: 3, direct_replies: 2 });
    expect(first.count).toMatchObject({ replies: 1, direct_replies: 1 });
    expect(nested.count).toMatchObject({ replies: 0, direct_replies: 0 });
  });

  it('expands a reply count into default replies', () => {
    const [root, ...replies] = commentThread('Root comment', 3);

    expect(replies.map((r) => r.html)).toEqual([
      '<p>Reply 1</p>',
      '<p>Reply 2</p>',
      '<p>Reply 3</p>',
    ]);
    expect(replies.map((r) => r.in_reply_to_snippet)).toEqual([
      'Root comment',
      'Root comment',
      'Root comment',
    ]);
    expect(root.count).toMatchObject({ replies: 3, direct_replies: 3 });
  });

  it('derives thread snippets from html text content and lets overrides win', () => {
    const [, first, second] = commentThread({ html: '<p>Hello <strong>world</strong>!</p>' }, [
      reply(),
      reply({
        parent_id: 'custom-parent',
        in_reply_to_snippet: 'Custom snippet',
        count: { replies: 9, direct_replies: 9, likes: 1, dislikes: 0, reports: 0 },
      }),
    ]);

    expect(first.in_reply_to_snippet).toBe('Hello world!');
    expect(second.parent_id).toBe('custom-parent');
    expect(second.in_reply_to_snippet).toBe('Custom snippet');
    expect(second.count).toEqual({
      replies: 9,
      direct_replies: 9,
      likes: 1,
      dislikes: 0,
      reports: 0,
    });
  });

  it('builds themes and the canned casper+edition list', () => {
    expect(theme()).toMatchObject({ name: 'casper', active: false, errors: [], warnings: [] });
    expect(theme({ active: true }).active).toBe(true);

    const { themes } = defaultThemesResponse();

    expect(themes.map(({ name, active }) => ({ name, active }))).toEqual([
      { name: 'casper', active: false },
      { name: 'edition', active: true },
    ]);
    expect(themes[1].package).toMatchObject({
      version: '1.0.0',
      author: { name: 'Ghost Foundation' },
    });
  });
});
