const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const scriptPath = path.resolve(
  __dirname,
  '../../../../core/frontend/src/member-attribution/member-attribution.js',
);
const script = fs.readFileSync(scriptPath, 'utf8');

function createStorage() {
  const values = new Map();

  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

function visit(storage, href) {
  const window = {
    location: new URL(href),
    document: { referrer: '' },
    history: { replaceState() {} },
    sessionStorage: storage,
  };

  function parseReferrerData(url) {
    const params = new URL(url).searchParams;
    const utmSource = params.get('utm_source');
    return {
      source: params.get('ref') || params.get('source') || utmSource || null,
      medium: params.get('utm_medium') || null,
      url: null,
      utmSource,
      utmMedium: params.get('utm_medium'),
      utmCampaign: params.get('utm_campaign'),
      utmTerm: params.get('utm_term'),
      utmContent: params.get('utm_content'),
    };
  }

  const getReferrer = (url) => {
    const data = parseReferrerData(url);
    return data.source || data.medium || data.url || null;
  };

  vm.runInNewContext(script, {
    window,
    URL,
    Date,
    console: { error() {}, warn() {} },
    require() {
      return { parseReferrerData, getReferrer };
    },
  });

  return JSON.parse(storage.getItem('ghost-history'));
}

describe('member attribution history', function () {
  it('keeps the first UTM set when a later same-path visit supplies only a source', function () {
    const storage = createStorage();

    visit(
      storage,
      'https://example.com/article/?utm_source=A&utm_medium=email&utm_campaign=CampaignA',
    );
    const history = visit(storage, 'https://example.com/article/?utm_source=B');

    assert.equal(history.length, 1);
    assert.equal(history[0].utmSource, 'A');
    assert.equal(history[0].utmMedium, 'email');
    assert.equal(history[0].utmCampaign, 'CampaignA');
  });

  it('captures the first later UTM set atomically and keeps it through later visits', function () {
    const storage = createStorage();

    visit(storage, 'https://example.com/article/');
    visit(storage, 'https://example.com/article/?utm_source=first');
    visit(
      storage,
      'https://example.com/article/?utm_source=second&utm_medium=paid&utm_campaign=CampaignB',
    );
    const history = visit(storage, 'https://example.com/article/');

    assert.equal(history.length, 1);
    assert.equal(history[0].utmSource, 'first');
    assert.equal(history[0].utmMedium, null);
    assert.equal(history[0].utmCampaign, null);
    assert.equal(history[0].utmTerm, null);
    assert.equal(history[0].utmContent, null);
  });
});
