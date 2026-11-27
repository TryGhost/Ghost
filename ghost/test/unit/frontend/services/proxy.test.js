const assert = require('node:assert/strict');
const sinon = require('sinon');

const proxy = require('../../../../core/frontend/services/proxy');
const serverEventBus = require('../../../../core/server/lib/common/events');

describe('Proxy: serverEvents', function () {
  let busOnStub;

  beforeEach(function () {
    busOnStub = sinon.stub(serverEventBus, 'on');
  });

  afterEach(function () {
    sinon.restore();
  });

  ['site.changed'].forEach(function (eventName) {
    it(`subscribes a listener to the permitted "${eventName}" event`, function () {
      const listener = () => {};

      proxy.serverEvents.on(eventName, listener);

      sinon.assert.calledOnceWithExactly(busOnStub, eventName, listener);
    });
  });

  it('throws an IncorrectUsageError for any other event and registers nothing', function () {
    assert.throws(
      () => {
        proxy.serverEvents.on('settings.edited', () => {});
      },
      { errorType: 'IncorrectUsageError' },
    );

    sinon.assert.notCalled(busOnStub);
  });
});

describe('Proxy: prepareContextResource', function () {
  it('removes data and aria attributes from feature image captions', function () {
    const resource = {
      feature_image_caption:
        '<span data-foo="bar" aria-label="caption" style="color: red"><a href="https://example.com">Caption</a></span>',
    };

    proxy.prepareContextResource(resource);

    assert.equal(
      resource.feature_image_caption.toString(),
      '<span style="color:red"><a href="https://example.com">Caption</a></span>',
    );
  });

  it('keeps links, inline formatting and line breaks', function () {
    const caption =
      '<b><strong>Bold</strong></b> <i><em>italic</em></i> <u>underline</u> <s>struck</s> <code>code</code> <mark>marked</mark> H<sub>2</sub>O x<sup>2</sup><br>Photo by <a href="https://example.com">Jo</a>';
    const resource = { feature_image_caption: caption };

    proxy.prepareContextResource(resource);

    // sanitize-html writes void elements self-closed
    assert.equal(resource.feature_image_caption.toString(), caption.replace('<br>', '<br />'));
  });

  it('still removes other elements from feature image captions', function () {
    const resource = {
      feature_image_caption:
        'By <a href="javascript:alert(1)" onclick="alert(1)">Jo</a><img src=x onerror=alert(1)><script>alert(1)</script><p>Text</p>',
    };

    proxy.prepareContextResource(resource);

    assert.equal(resource.feature_image_caption.toString(), 'By <a>Jo</a>Text');
  });

  it('handles a resource that has already been prepared', function () {
    const resource = {
      feature_image_caption:
        '<span data-foo="bar"><a href="https://example.com">Caption</a></span>',
    };

    proxy.prepareContextResource(resource);
    proxy.prepareContextResource(resource);

    assert.equal(
      resource.feature_image_caption.toString(),
      '<span><a href="https://example.com">Caption</a></span>',
    );
  });
});
