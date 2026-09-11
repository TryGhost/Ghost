const assert = require('node:assert/strict');
const sinon = require('sinon');
const I18n = require('../../../../../../core/frontend/services/theme-engine/i18n/i18n');

describe('i18n compiled message cache', function () {
  let i18n;

  beforeEach(function () {
    i18n = new I18n({ stringMode: 'fulltext' });
    sinon.stub(i18n, '_loadStrings').returns({ greeting: 'Hello {name}' });
    sinon.stub(i18n, '_handleFormatError');
    i18n.init();
  });

  afterEach(function () {
    sinon.restore();
  });

  it('reuses the compiled translation with fresh bindings', function () {
    assert.equal(i18n.t('greeting', { name: 'Alice' }), 'Hello Alice');
    const formatter = [...i18n._messageFormats.values()][0];
    const format = sinon.spy(formatter, 'format');

    assert.equal(i18n.t('greeting', { name: 'Bob' }), 'Hello Bob');
    sinon.assert.calledOnce(format);
    assert.equal(i18n._messageFormats.size, 1);

    i18n._strings.greeting = 'Welcome {name}';
    assert.equal(i18n.t('greeting', { name: 'Bob' }), 'Welcome Bob');
    assert.equal(i18n._messageFormats.size, 2);
  });

  it('clears compiled messages on init', function () {
    i18n.t('greeting', { name: 'Alice' });
    assert.equal(i18n._messageFormats.size, 1);

    i18n.init();
    assert.equal(i18n._messageFormats.size, 0);
    assert.equal(i18n.t('greeting', { name: 'Bob' }), 'Hello Bob');
  });

  it('uses the locale as well as the message content', function () {
    assert.equal(i18n.t('{n, number}', { n: 1234.5 }), '1,234.5');
    i18n._locale = 'de';
    assert.equal(i18n.t('{n, number}', { n: 1234.5 }), '1.234,5');
    assert.equal(i18n._messageFormats.size, 2);
  });

  it('falls back for malformed messages without caching them', function () {
    assert.equal(i18n.t('Hello {'), 'An error occurred');
    assert.equal(i18n.t('Hello {'), 'An error occurred');
    sinon.assert.calledTwice(i18n._handleFormatError);
    assert.equal(i18n._messageFormats.size, 0);
  });

  it('falls back for missing bindings and removes a previously cached message', function () {
    assert.equal(i18n.t('greeting', {}), 'An error occurred');
    assert.equal(i18n._messageFormats.size, 0);
    assert.equal(i18n.t('greeting', { name: 'Alice' }), 'Hello Alice');
    assert.equal(i18n.t('greeting', {}), 'An error occurred');
    assert.equal(i18n._messageFormats.size, 0);
    sinon.assert.calledTwice(i18n._handleFormatError);
  });

  it('bounds the cache when fulltext keys contain arbitrary content', function () {
    for (let n = 0; n < 5000; n += 1) {
      assert.equal(i18n.t(`Message ${n}`), `Message ${n}`);
    }
    assert.equal(i18n._messageFormats.size, 5000);
    assert.equal(i18n.t('One more message'), 'One more message');
    assert.equal(i18n._messageFormats.size, 1);
    assert.equal(i18n.t('Message 0'), 'Message 0');
  });
});
