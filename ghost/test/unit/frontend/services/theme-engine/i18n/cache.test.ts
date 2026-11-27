import assert from 'node:assert/strict';
import sinon from 'sinon';
import MessageFormat from 'intl-messageformat';
// @ts-expect-error This module lacks type definitions.
import I18n from '../../../../../../core/frontend/services/theme-engine/i18n/i18n';

describe('i18n compiled message cache', function () {
  let i18n: InstanceType<typeof I18n>;
  let parse: sinon.SinonSpy;

  beforeEach(function () {
    i18n = new I18n({ stringMode: 'fulltext' });
    sinon.stub(i18n, '_loadStrings').returns({ greeting: 'Hello {name}' });
    sinon.stub(i18n, '_handleFormatError');
    i18n.init();

    // Every compiled message is parsed exactly once, so this counts compiles.
    parse = sinon.spy(MessageFormat, '__parse');
  });

  afterEach(function () {
    sinon.restore();
  });

  it('reuses the compiled translation with fresh bindings', function () {
    assert.equal(i18n.t('greeting', { name: 'Alice' }), 'Hello Alice');
    assert.equal(i18n.t('greeting', { name: 'Bob' }), 'Hello Bob');
    sinon.assert.calledOnce(parse);

    i18n._strings.greeting = 'Welcome {name}';
    assert.equal(i18n.t('greeting', { name: 'Bob' }), 'Welcome Bob');
    sinon.assert.calledTwice(parse);
  });

  it('clears compiled messages on init', function () {
    i18n.t('greeting', { name: 'Alice' });
    sinon.assert.calledOnce(parse);

    i18n.init();
    assert.equal(i18n.t('greeting', { name: 'Bob' }), 'Hello Bob');
    sinon.assert.calledTwice(parse);
  });

  it('uses the locale as well as the message content', function () {
    assert.equal(i18n.t('{n, number}', { n: 1234.5 }), '1,234.5');
    i18n._locale = 'de';
    assert.equal(i18n.t('{n, number}', { n: 1234.5 }), '1.234,5');
    sinon.assert.calledTwice(parse);
  });

  it('falls back for malformed messages without caching them', function () {
    assert.equal(i18n.t('Hello {'), 'An error occurred');
    assert.equal(i18n.t('Hello {'), 'An error occurred');
    sinon.assert.calledTwice(i18n._handleFormatError);
    // Both attempts reparse the malformed message; the fallback text is parsed too.
    assert.equal(parse.withArgs('Hello {').callCount, 2);
  });

  it('falls back for missing bindings and keeps the compiled message', function () {
    assert.equal(i18n.t('greeting', {}), 'An error occurred');
    assert.equal(i18n.t('greeting', { name: 'Alice' }), 'Hello Alice');
    assert.equal(i18n.t('greeting', {}), 'An error occurred');
    sinon.assert.calledTwice(i18n._handleFormatError);
    assert.equal(parse.withArgs('Hello {name}').callCount, 1);
  });

  it('bounds the cache when fulltext keys contain arbitrary content', function () {
    for (let n = 0; n < 5000; n += 1) {
      assert.equal(i18n.t(`Message ${n}`), `Message ${n}`);
    }
    assert.equal(parse.callCount, 5000);

    // One more entry evicts the least recently used one, 'Message 0'.
    assert.equal(i18n.t('One more message'), 'One more message');
    assert.equal(i18n.t('Message 4999'), 'Message 4999');
    assert.equal(parse.callCount, 5001);

    assert.equal(i18n.t('Message 0'), 'Message 0');
    assert.equal(parse.callCount, 5002);
  });
});
