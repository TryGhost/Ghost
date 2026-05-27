const logging = require('@tryghost/logging');
const sentry = require('../../../shared/sentry');
const urlUtils = require('../../../shared/url-utils');

const LLMS_LOG_KEY = '[llms]';

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
        try {
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
        } catch (err) {
            const eventName = `llms.serve_${format}`;
            const eventDetails = {route: req.path};

            logging.error({
                system: {event: eventName, ...eventDetails},
                err
            }, `${LLMS_LOG_KEY} ${err.message}`);

            sentry.captureException(err, {
                tags: {source: eventName},
                extra: eventDetails
            });

            return next(err);
        }
    }

    function mountLlmsRoutes(siteApp) {
        siteApp.get('/llms.txt', (req, res, next) => serveLlms(req, res, next, 'index'));
        siteApp.get('/llms-full.txt', (req, res, next) => serveLlms(req, res, next, 'full'));
        siteApp.get('/.well-known/llms.txt', (req, res, next) => serveLlms(req, res, next, 'index'));
        siteApp.get('/.well-known/llms-full.txt', (req, res, next) => serveLlms(req, res, next, 'full'));
    }

    return {mountLlmsRoutes};
}

module.exports = {createLlmsHandler};
