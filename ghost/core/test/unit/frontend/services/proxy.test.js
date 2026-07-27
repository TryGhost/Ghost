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

    ['site.changed', 'url.added', 'url.removed'].forEach(function (eventName) {
        it(`subscribes a listener to the permitted "${eventName}" event`, function () {
            const listener = () => {};

            proxy.serverEvents.on(eventName, listener);

            sinon.assert.calledOnceWithExactly(busOnStub, eventName, listener);
        });
    });

    it('throws an IncorrectUsageError for any other event and registers nothing', function () {
        assert.throws(() => {
            proxy.serverEvents.on('settings.edited', () => {});
        }, {errorType: 'IncorrectUsageError'});

        sinon.assert.notCalled(busOnStub);
    });
});

describe('Proxy: prepareContextResource', function () {
    it('removes data and aria attributes from feature image captions', function () {
        const resource = {
            feature_image_caption: '<span data-foo="bar" aria-label="caption" style="color: red"><a href="https://example.com">Caption</a></span>'
        };

        proxy.prepareContextResource(resource);

        assert.equal(resource.feature_image_caption.toString(), '<span style="color: red"><a href="https://example.com">Caption</a></span>');
    });
});
