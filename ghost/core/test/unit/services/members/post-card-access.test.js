const assert = require('node:assert/strict');
const { getPostCardAccess } = require('../../../../core/server/services/members/post-card-access');

const card = (id) => ({
  type: 'addon',
  version: 1,
  id,
  addonHandle: 'podcast',
  blockName: 'episode',
  props: {},
  publicProps: {},
  html: '<p>Episode</p>',
});
const document = (children) =>
  JSON.stringify({
    root: { type: 'root', version: 1, direction: null, format: '', indent: 0, children },
  });
const html = (value) => ({ type: 'html', version: 1, html: value });

describe('Post card access', function () {
  it('omits IDs duplicated by a nested card even when the HTML renderer skips that card', async function () {
    const post = {
      visibility: 'public',
      lexical: document([
        card('same'),
        {
          type: 'paragraph',
          version: 1,
          direction: null,
          format: '',
          indent: 0,
          children: [card('same')],
        },
      ]),
    };
    assert.deepEqual(await getPostCardAccess(post, null), { access: true, visible_card_ids: [] });
  });
  it('omits cards whose empty or unsafe snapshots the website refuses to render', async function () {
    const post = {
      visibility: 'public',
      lexical: document([
        { ...card('empty'), html: '' },
        { ...card('unsafe'), addonHandle: '' },
        card('visible'),
      ]),
    };
    assert.deepEqual(await getPostCardAccess(post, null), {
      access: true,
      visible_card_ids: ['visible'],
    });
  });
  it('preserves fallback markup that affects the website gating of following cards', async function () {
    const post = {
      visibility: 'public',
      lexical: document([
        {
          ...card('first'),
          portableHtml: '<!--kg-gated-block:begin nonMember:false memberSegment:"status:-free"-->',
        },
        card('hidden'),
        html('<!--kg-gated-block:end-->'),
      ]),
    };
    assert.deepEqual(await getPostCardAccess(post, null), {
      access: true,
      visible_card_ids: ['first'],
    });
  });
  it('uses the public preview divider for anonymous readers and full access for entitled readers', async function () {
    const post = {
      visibility: 'paid',
      lexical: document([card('preview'), { type: 'paywall', version: 1 }, card('full')]),
    };
    assert.deepEqual(await getPostCardAccess(post, null), {
      access: false,
      visible_card_ids: ['preview'],
    });
    assert.deepEqual(await getPostCardAccess(post, { status: 'paid' }), {
      access: true,
      visible_card_ids: ['preview', 'full'],
    });
  });
  it('omits missing and ambiguous identities, including a duplicate hidden by the paywall', async function () {
    const post = {
      visibility: 'paid',
      lexical: document([card('same'), card(''), { type: 'paywall', version: 1 }, card('same')]),
    };
    assert.deepEqual(await getPostCardAccess(post, null), { access: false, visible_card_ids: [] });
  });
  it('uses website conditional-content rules without treating arbitrary HTML as card identity', async function () {
    const post = {
      visibility: 'public',
      lexical: document([
        html('<!--kg-gated-block:begin nonMember:false memberSegment:"status:-free"-->'),
        card('paid-only'),
        html('<!--kg-gated-block:end-->'),
        card('everyone'),
        html('<span data-addon-card-id="fabricated">fabricated</span>'),
      ]),
    };
    for (const member of [null, { status: 'free' }]) {
      assert.deepEqual(await getPostCardAccess(post, member), {
        access: true,
        visible_card_ids: ['everyone'],
      });
    }
    assert.deepEqual(await getPostCardAccess(post, { status: 'paid' }), {
      access: true,
      visible_card_ids: ['paid-only', 'everyone'],
    });
  });
  it('does not let a forged public HTML identity expose a real card below the divider', async function () {
    const post = {
      visibility: 'paid',
      lexical: document([
        html('<div data-addon-id="hidden">hidden</div>'),
        { type: 'paywall', version: 1 },
        card('hidden'),
      ]),
    };
    assert.deepEqual(await getPostCardAccess(post, null), { access: false, visible_card_ids: [] });
  });
  it('applies post access without a divider and fails closed when rendering is malformed', async function () {
    for (const visibility of ['members', 'paid', 'tiers']) {
      assert.deepEqual(
        await getPostCardAccess({ visibility, lexical: document([card('hidden')]) }, null),
        { access: false, visible_card_ids: [] },
      );
    }
    assert.deepEqual(await getPostCardAccess({ visibility: 'public', lexical: null }, null), {
      access: true,
      visible_card_ids: [],
    });
    await assert.rejects(getPostCardAccess({ visibility: 'public', lexical: '{invalid' }, null));
  });
});
