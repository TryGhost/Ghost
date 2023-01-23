const assert = require('assert');
const RoutingService = require('../../../../../core/server/services/mentions/RoutingService');

describe('RoutingService', function () {
    describe('pageExists', function () {
        it('Returns false if the url is from a different origin', async function () {
            const siteUrl = new URL('https://website.com');
            const routingService = new RoutingService({
                siteUrl
            });

            const result = await routingService.pageExists(new URL('https://different-website.com'));

            assert.equal(result, false);
        });

        it('Returns false if the url is not on the correct subdirectory', async function () {
            const siteUrl = new URL('https://website.com/subdir');
            const routingService = new RoutingService({
                siteUrl
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

        it('Returns true if the url is on the correct origin and subdirectory', async function () {
            const siteUrl = new URL('https://website.com/subdir');
            const routingService = new RoutingService({
                siteUrl
            });

            checkJustSubdomain: {
                const result = await routingService.pageExists(new URL('https://website.com/subdir'));
                assert.equal(result, true);
                break checkJustSubdomain;
            }

            checkLongerPath: {
                const result = await routingService.pageExists(new URL('https://website.com/subdir/page'));
                assert.equal(result, true);
                break checkLongerPath;
            }
        });
    });
});
