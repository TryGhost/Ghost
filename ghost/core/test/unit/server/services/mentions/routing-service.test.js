const assert = require('assert/strict');
const sinon = require('sinon');
const nock = require('nock');
const ObjectID = require('bson-objectid').default;

const externalRequest = require('../../../../../core/server/lib/request-external');
const RoutingService = require('../../../../../core/server/services/mentions/RoutingService');

describe('RoutingService', function () {
    afterEach(function () {
        sinon.restore();
        nock.cleanAll();
    });

    describe('pageExists', function () {
        describe('URL checks', function () {
            it('Returns false if the url is from a different origin', async function () {
                const siteUrl = new URL('https://website.com');
                const resourceService = {
                    getByURL: sinon.stub()
                };
                const routingService = new RoutingService({
                    siteUrl,
                    resourceService,
                    externalRequest
                });

                const result = await routingService.pageExists(new URL('https://different-website.com'));

                assert.equal(result, false);
            });

            it('Returns false if the url is not on the correct subdirectory', async function () {
                const siteUrl = new URL('https://website.com/subdir');
                const resourceService = {
                    getByURL: sinon.stub()
                };
                const routingService = new RoutingService({
                    siteUrl,
                    resourceService,
                    externalRequest
                });

                checkNoSubdomain: {
                    const result = await routingService.pageExists(new URL('https://website.com'));
                    assert.equal(result, false);
                    break checkNoSubdomain;
                }

                checkIncorrectSubdomain: {
                    const result = await routingService.pageExists(new URL('https://website.com/different'));
                    assert.equal(result, false);
                    break checkIncorrectSubdomain;
                }
            });
        });

        describe('Resource checks', function () {
            it('Returns true if a resource exists for the URL', async function () {
                const siteUrl = new URL('https://website.com/subdir');
                const resourceService = {
                    getByURL: sinon.stub()
                };
                const routingService = new RoutingService({
                    siteUrl,
                    resourceService,
                    externalRequest
                });

                resourceService.getByURL.resolves({type: 'post', id: new ObjectID});

                const result = await routingService.pageExists(new URL('https://website.com/subdir/post'));
                assert.equal(result, true);
            });
        });

        describe('Network checks', function () {
            it('Returns true if the URL responds with a 200 status code to a HEAD request', async function () {
                const siteUrl = new URL('https://website.com/subdir');
                const resourceService = {
                    getByURL: sinon.stub()
                };
                const routingService = new RoutingService({
                    siteUrl,
                    resourceService,
                    externalRequest
                });

                resourceService.getByURL.resolves({type: null, id: null});

                nock('https://website.com').head('/subdir/should-exist').reply(200);

                const result = await routingService.pageExists(new URL('https://website.com/subdir/should-exist'));
                assert.equal(result, true);
            });

            it('Returns true if the URL responds with a 301 status code to a HEAD request', async function () {
                const siteUrl = new URL('https://website.com/subdir');
                const resourceService = {
                    getByURL: sinon.stub()
                };
                const routingService = new RoutingService({
                    siteUrl,
                    resourceService,
                    externalRequest
                });

                resourceService.getByURL.resolves({type: null, id: null});

                nock('https://website.com').head('/subdir/should-redirect').reply(301);

                const result = await routingService.pageExists(new URL('https://website.com/subdir/should-redirect'));
                assert.equal(result, true);
            });

            it('Returns false if the URL responds with a 404 status code to a HEAD request', async function () {
                const siteUrl = new URL('https://website.com/subdir');
                const resourceService = {
                    getByURL: sinon.stub()
                };
                const routingService = new RoutingService({
                    siteUrl,
                    resourceService,
                    externalRequest
                });

                resourceService.getByURL.resolves({type: null, id: null});

                nock('https://website.com').head('/subdir/not-exist').reply(404);

                const result = await routingService.pageExists(new URL('https://website.com/subdir/not-exist'));
                assert.equal(result, false);
            });

            it('Returns false if the URL responds with a 500 status code to a HEAD request', async function () {
                const siteUrl = new URL('https://website.com/subdir');
                const resourceService = {
                    getByURL: sinon.stub()
                };
                const routingService = new RoutingService({
                    siteUrl,
                    resourceService,
                    externalRequest
                });

                resourceService.getByURL.resolves({type: null, id: null});

                nock('https://website.com').head('/subdir/big-error').reply(500);

                const result = await routingService.pageExists(new URL('https://website.com/subdir/big-error'));
                assert.equal(result, false);
            });
        });
    });
});
