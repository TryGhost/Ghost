const assert = require('node:assert/strict');
const {assertExists} = require('../../../utils/assertions');
const sinon = require('sinon');
const hbs = require('../../../../core/frontend/services/theme-engine/engine');
const cancel_link = require('../../../../core/frontend/helpers/cancel_link');
const labs = require('../../../../core/shared/labs');
const configUtils = require('../../../utils/config-utils');
const logging = require('@tryghost/logging');

describe('{{cancel_link}} helper', function () {
    let labsStub;
    before(function (done) {
        hbs.express4({partialsDir: [configUtils.config.get('paths').helperTemplates]});

        hbs.cachePartials(function () {
            done();
        });
    });

    beforeEach(function () {
        labsStub = sinon.stub(labs, 'isSet').returns(true);
    });

    afterEach(function () {
        sinon.restore();
    });

    const defaultLinkClass = /class="gh-subscription-cancel"/;
    const defaultErrorElementClass = /class="gh-error gh-error-subscription-cancel"/;
    const defaultCancelLinkText = /Cancel subscription/;
    const defaultContinueLinkText = /Continue subscription/;

    it('should throw if subscription data is incorrect', function () {
        const runHelper = function (data) {
            return function () {
                cancel_link.call(data);
            };
        };

        assert.throws(runHelper('not an object'));
        assert.throws(runHelper(function () { }));
        assert.throws(runHelper({}));
        assert.throws(runHelper({id: ''}));
        assert.throws(runHelper({cancel_at_period_end: ''}));
    });

    it('can render cancel subscription link', function () {
        const rendered = cancel_link.call({
            id: 'sub_cancel',
            cancel_at_period_end: false
        });
        assertExists(rendered);

        assert.match(rendered.string, defaultLinkClass);
        assert.match(rendered.string, /data-members-cancel-subscription="sub_cancel"/);
        assert.match(rendered.string, defaultCancelLinkText);

        assert.match(rendered.string, defaultErrorElementClass);
    });

    it('can render continue subscription link', function () {
        const rendered = cancel_link.call({
            id: 'sub_continue',
            cancel_at_period_end: true
        });
        assertExists(rendered);

        assert.match(rendered.string, defaultLinkClass);
        assert.match(rendered.string, /data-members-continue-subscription="sub_continue"/);
        assert.match(rendered.string, defaultContinueLinkText);
    });

    it('can render custom link class', function () {
        const rendered = cancel_link.call({
            id: 'sub_cancel',
            cancel_at_period_end: false
        }, {
            hash: {
                class: 'custom-link-class'
            }
        });
        assertExists(rendered);

        assert.match(rendered.string, /custom-link-class/);
    });

    it('can render custom error class', function () {
        const rendered = cancel_link.call({
            id: 'sub_cancel',
            cancel_at_period_end: false
        }, {
            hash: {
                errorClass: 'custom-error-class'
            }
        });
        assertExists(rendered);

        assert.match(rendered.string, /custom-error-class/);
    });

    it('can render custom cancel subscription link attributes', function () {
        const rendered = cancel_link.call({
            id: 'sub_cancel',
            cancel_at_period_end: false
        }, {
            hash: {
                cancelLabel: 'custom cancel link text'
            }
        });
        assertExists(rendered);

        assert.match(rendered.string, /custom cancel link text/);
    });

    it('can render custom continue subscription link attributes', function () {
        const rendered = cancel_link.call({
            id: 'sub_cancel',
            cancel_at_period_end: true
        }, {
            hash: {
                continueLabel: 'custom continue link text'
            }
        });
        assertExists(rendered);

        assert.match(rendered.string, /custom continue link text/);
    });

    it('is disabled if labs flag is not set', function () {
        labsStub.returns(false);
        const loggingStub = sinon.stub(logging, 'error');

        const rendered = cancel_link.call({
            id: 'sub_continue',
            cancel_at_period_end: true
        });

        assertExists(rendered);

        assert.match(rendered.string, /^<script/);
        assert.match(rendered.string, /helper is not available/);

        sinon.assert.calledOnce(loggingStub);
    });
});
