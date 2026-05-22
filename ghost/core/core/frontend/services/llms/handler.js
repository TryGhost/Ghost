const urlUtils = require('../../../shared/url-utils');

function createLlmsHandler({llmsService, config, settingsCache}) {
    function handleDisabledLlmsRequest(req, res, next) {
        if (settingsCache.get('is_private')) {
            return next();
        }

        return res.redirect(302, urlUtils.urlFor({relativeUrl: '/'}));
    }

    function setLlmsHeaders(res) {
        res.set({
            'Cache-Control': `public, max-age=${config.get('caching:llms:maxAge')}`,
            'Content-Type': 'text/plain; charset=utf-8'
        });
    }

    async function serveLlms(req, res, next, format) {
        if (!llmsService.isEnabled()) {
            return handleDisabledLlmsRequest(req, res, next);
        }

        const content = format === 'full'
            ? await llmsService.getLlmsFullTxt()
            : await llmsService.getLlmsTxt();

        if (!content) {
            return next();
        }

        setLlmsHeaders(res);
        return res.send(content);
    }

    function mountLlmsRoutes(siteApp) {
        siteApp.get('/llms.txt', async function serveLlmsTxt(req, res, next) {
            try {
                return await serveLlms(req, res, next, 'index');
            } catch (err) {
                return next(err);
            }
        });

        siteApp.get('/llms-full.txt', async function serveLlmsFullTxt(req, res, next) {
            try {
                return await serveLlms(req, res, next, 'full');
            } catch (err) {
                return next(err);
            }
        });

        siteApp.get('/.well-known/llms.txt', async function serveWellKnownLlmsTxt(req, res, next) {
            try {
                return await serveLlms(req, res, next, 'index');
            } catch (err) {
                return next(err);
            }
        });

        siteApp.get('/.well-known/llms-full.txt', async function serveWellKnownLlmsFullTxt(req, res, next) {
            try {
                return await serveLlms(req, res, next, 'full');
            } catch (err) {
                return next(err);
            }
        });
    }

    return {mountLlmsRoutes};
}

module.exports = {createLlmsHandler};
