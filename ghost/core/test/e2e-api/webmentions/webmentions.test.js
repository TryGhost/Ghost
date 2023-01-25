const {agentProvider, fixtureManager, mockManager, matchers, sleep} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');
const assert = require('assert');
const urlUtils = require('../../../core/shared/url-utils');
const nock = require('nock');

describe('Webmentions (receiving)', function () {
    let agent;
    before(async function () {
        agent = await agentProvider.getWebmentionsAPIAgent();
        await fixtureManager.init('posts');
        nock.disableNetConnect();
    });

    after(function () {
        nock.cleanAll();
        nock.enableNetConnect();
    });
});
