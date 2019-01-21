const should = require('should');
const url = require('url');
const sinon = require('sinon');
const models = require('../../../server/models');
const testUtils = require('../../utils');
const {knex} = require('../../../server/data/db');

describe('Unit: models/webhooks', function () {
    before(function () {
        models.init();
    });
    after(function () {
        sinon.restore();
    });

    before(testUtils.teardown);
    before(testUtils.setup('webhooks'));

    it('can correctly use getByEventAndTarget', function () {
        return models.Webhook.getByEventAndTarget('subscriber.added', 'https://example.com/webhooks/subscriber-added')
            .then(function (webhook) {
                webhook.get('event').should.eql('subscriber.added');
                webhook.get('target_url').should.eql('https://example.com/webhooks/subscriber-added');
            });
    });
});
