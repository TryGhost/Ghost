import SlackObject from 'ghost-admin/models/slack-integration';
import validator from 'ghost-admin/validators/slack-integration';
import {
    describe,
    it
} from 'mocha';
import {expect} from 'chai';

const testInvalidUrl = function (url) {
    let slackObject = SlackObject.create({url});

    validator.check(slackObject, 'url');

    expect(validator.get('passed'), `"${url}" passed`).to.be.false;
    expect(slackObject.get('errors').errorsFor('url').toArray()).to.deep.equal([{
        attribute: 'url',
        message: 'The URL must be in a format like https://hooks.slack.com/services/<your personal key>'
    }]);
    expect(slackObject.get('hasValidated')).to.include('url');
};

const testValidUrl = function (url) {
    let slackObject = SlackObject.create({url});

    validator.check(slackObject, 'url');

    expect(validator.get('passed'), `"${url}" failed`).to.be.true;
    expect(slackObject.get('hasValidated')).to.include('url');
};

describe('Unit: Validator: slack-integration', function () {
    it('fails on invalid url values', function () {
        let invalidUrls = [
            'test@example.com',
            '/has spaces',
            'no-leading-slash',
            'http://example.com/with spaces'
        ];

        invalidUrls.forEach(function (url) {
            testInvalidUrl(url);
        });
    });

    it('passes on valid url values', function () {
        let validUrls = [
            'https://hooks.slack.com/services/;alskdjf',
            'https://hooks.slack.com/services/123445678',
            'https://hooks.slack.com/services/some_webhook',
            'https://discordapp.com/api/webhooks/380692408364433418/mGLHSRyEoUaTvY91Te16WOT8Obn-BrJoiTNoxeUqhb6klKERb9xaZkUBYC5AeduwYCCy/slack'
        ];

        validUrls.forEach(function (url) {
            testValidUrl(url);
        });
    });

    it('validates url by default', function () {
        let slackObject = SlackObject.create();

        validator.check(slackObject);

        expect(slackObject.get('errors').errorsFor('url')).to.be.empty;
        expect(validator.get('passed')).to.be.true;
    });
});
