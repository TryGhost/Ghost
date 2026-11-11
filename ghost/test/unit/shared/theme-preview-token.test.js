const assert = require('node:assert/strict');
const sinon = require('sinon');
const settingsCache = require('../../../core/shared/settings-cache');
const previewToken = require('../../../core/shared/theme-preview-token');

describe('Theme preview tokens', function () {
  let secret;

  beforeEach(function () {
    secret = 'a'.repeat(64);
    sinon.stub(settingsCache, 'get').callsFake((key) => {
      return key === 'admin_session_secret' ? secret : undefined;
    });
  });

  afterEach(function () {
    sinon.restore();
  });

  it('names the theme it was made for until it expires', function () {
    const now = Date.now();
    const { token, expiresAt } = previewToken.create('casper', now);

    assert.equal(expiresAt, now + previewToken.TTL_MS);
    assert.equal(previewToken.verify(token, now), 'casper');
    assert.equal(previewToken.verify(token, expiresAt - 1), 'casper');
    assert.equal(previewToken.verify(token, expiresAt), null);
  });

  it('is safe to put in a URL path', function () {
    const { token } = previewToken.create('my theme/../x');

    assert.match(token, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    assert.equal(previewToken.verify(token), 'my theme/../x');
  });

  it('refuses a token naming another theme than it was signed for', function () {
    const { token } = previewToken.create('casper');
    const [, signature] = token.split('.');
    const otherPayload = Buffer.from(
      JSON.stringify({ t: 'source', e: Date.now() + 60000 }),
    ).toString('base64url');

    assert.equal(previewToken.verify(`${otherPayload}.${signature}`), null);
  });

  it('refuses a token signed with another secret', function () {
    const { token } = previewToken.create('casper');
    secret = 'b'.repeat(64);

    assert.equal(previewToken.verify(token), null);
  });

  it('refuses malformed tokens', function () {
    for (const token of [undefined, null, 42, '', 'abc', 'a.b.c', '.', 'x'.repeat(3000)]) {
      assert.equal(previewToken.verify(token), null);
    }
  });

  it('makes and accepts nothing without a secret to sign with', function () {
    const { token } = previewToken.create('casper');
    secret = undefined;

    assert.equal(previewToken.create('casper'), null);
    assert.equal(previewToken.verify(token), null);
  });

  it("makes an asset token that fetches the theme's files but can't render pages", function () {
    const { token } = previewToken.create('casper');
    const assetToken = previewToken.assetTokenFor(token);

    assert.notEqual(assetToken, token);
    assert.equal(previewToken.verifyAsset(assetToken), 'casper');
    assert.equal(previewToken.verify(assetToken), null);
    assert.equal(previewToken.verifyAsset(token), null);
  });
});
