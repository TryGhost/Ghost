const assert = require('assert');
const sinon = require('sinon');
const ObjectID = require('bson-objectid').default;
const RoutingService = require('../../../../../core/server/services/mentions/RoutingService');

describe('RoutingService', function () {
    describe('pageExists', function () {
        describe('URL checks', function () {
            it('Returns false if the url is from a different origin', async function () {
                const siteUrl = new URL('https://website.com');
                const resourceService = {
                    getByURL: sinon.stub()
                };
                const routingService = new RoutingService({
                    siteUrl,
                    resourceService
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
                    resourceService
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
                    resourceService
                });

                resourceService.getByURL.resolves({type: 'post', id: new ObjectID});

                const result = await routingService.pageExists(new URL('https://website.com/subdir/post'));
                assert.equal(result, true);
            });

            it('Returns false if the url is on the correct origin and subdirectory and a resource does not exist', async function () {
                const siteUrl = new URL('https://website.com/subdir');
                const resourceService = {
                    getByURL: sinon.stub()
                };
                const routingService = new RoutingService({
                    siteUrl,
                    resourceService
                });

                resourceService.getByURL.resolves(null);

                checkJustSubdomain: {
                    const result = await routingService.pageExists(new URL('https://website.com/subdir'));
                    assert.equal(result, false);
                    break checkJustSubdomain;
                }

                checkLongerPath: {
                    const result = await routingService.pageExists(new URL('https://website.com/subdir/page'));
                    assert.equal(result, false);
                    break checkLongerPath;
                }
            });
        });
    });
});
