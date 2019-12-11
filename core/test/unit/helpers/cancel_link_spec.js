const should = require('should');
const hbs = require('../../../frontend/services/themes/engine');
const helpers = require('../../../frontend/helpers');
const configUtils = require('../../utils/configUtils');

describe.only('{{cancel_link}} helper', function () {
    before(function (done) {
        hbs.express4({partialsDir: [configUtils.config.get('paths').helperTemplates]});

        hbs.cachePartials(function () {
            done();
        });
    });

    const defaultButtonClass = /class="cancel-subscription-button"/;
    const defaultErrorElementClass = /cancel-subscription-error/;
    const defaultCancelButtonText = /Cancel subscription/;
    const defaultContinueButtonText = /Continue subscription/;

    it('should throw if subscription data is incorrect', function () {
        var runHelper = function (data) {
                return function () {
                    helpers.cancel_link.call(data);
                };
            }, expectedMessage = 'The {{cancel_link}} helper was used outside of a subscription context. See https://ghost.org/docs/api/handlebars-themes/helpers/cancel_link/.';

        runHelper('not an object').should.throwError(expectedMessage);
        runHelper(function () {
        }).should.throwError(expectedMessage);
    });

    it('can render cancel subscription button', function () {
        const rendered = helpers.cancel_link.call({
            id: 'sub_cancel',
            cancel_at_period_end: false
        });
        should.exist(rendered);

        rendered.string.should.match(defaultButtonClass);
        rendered.string.should.match(/data-members-cancel-subscription="sub_cancel"/);
        rendered.string.should.match(defaultCancelButtonText);

        rendered.string.should.match(defaultErrorElementClass);
    });

    it('can render continue subscription button', function () {
        const rendered = helpers.cancel_link.call({
            id: 'sub_continue',
            cancel_at_period_end: true
        });
        should.exist(rendered);

        rendered.string.should.match(defaultButtonClass);
        rendered.string.should.match(/data-members-continue-subscription="sub_continue"/);
        rendered.string.should.match(defaultContinueButtonText);
    });

    it('can render custom button class', function () {
        const rendered = helpers.cancel_link.call({
            id: 'sub_cancel',
            cancel_at_period_end: false
        }, {
            hash: {
                class: 'custom-button-class'
            }
        });
        should.exist(rendered);

        rendered.string.should.match(/custom-button-class/);
    });

    it('can render custom error class', function () {
        const rendered = helpers.cancel_link.call({
            id: 'sub_cancel',
            cancel_at_period_end: false
        }, {
            hash: {
                errorClass: 'custom-error-class'
            }
        });
        should.exist(rendered);

        rendered.string.should.match(/custom-error-class/);
    });

    it('can render custom cancel subscription button attributes', function () {
        const rendered = helpers.cancel_link.call({
            id: 'sub_cancel',
            cancel_at_period_end: false
        }, {
            hash: {
                cancelLabel: 'custom cancel button text'
            }
        });
        should.exist(rendered);

        rendered.string.should.match(/custom cancel button text/);
    });

    it('can render custom continue subscription button attributes', function () {
        const rendered = helpers.cancel_link.call({
            id: 'sub_cancel',
            cancel_at_period_end: true
        }, {
            hash: {
                continueLabel: 'custom continue button text'
            }
        });
        should.exist(rendered);

        rendered.string.should.match(/custom continue button text/);
    });
});
