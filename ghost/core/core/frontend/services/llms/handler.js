const config = require('../../../shared/config');
const settingsCache = require('../../../shared/settings-cache');
const urlUtils = require('../../../shared/url-utils');
const urlService = require('../../../server/services/url');
const llmsService = require('./service');
const {
    getMarkdownPath,
    getResourcePathFromMarkdownPath,
    renderEntryMarkdown
} = require('./markdown');

function getRequestSearch(req) {
    const searchIndex = req.originalUrl?.indexOf('?') ?? -1;

    if (searchIndex === -1) {
        return '';
    }

    return req.originalUrl.slice(searchIndex);
}

function redirectToWebRoute(res, pathname, search = '') {
    return res.redirect(302, `${urlUtils.urlFor({relativeUrl: pathname})}${search}`);
}

function handleDisabledLlmsRequest(req, res, next, pathname) {
    if (settingsCache.get('is_private')) {
        return next();
    }

    return redirectToWebRoute(res, pathname, getRequestSearch(req));
}

function setLlmsHeaders(res) {
    res.set({
        'Cache-Control': `public, max-age=${config.get('caching:llms:maxAge')}`,
        'Content-Type': 'text/plain; charset=utf-8'
    });
}

function setMarkdownHeaders(res, contentType) {
    res.set({
        'Content-Type': `${contentType}; charset=utf-8`
    });
}

async function serveLlms(req, res, next, format) {
    if (!llmsService.isEnabled()) {
        return handleDisabledLlmsRequest(req, res, next, '/');
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

function mountMarkdownRoutes(siteApp) {
    siteApp.get(/.+\.md$/, async function serveMarkdownEntry(req, res, next) {
        const resourcePath = getResourcePathFromMarkdownPath(req.path);

        if (!resourcePath) {
            return next();
        }

        if (!llmsService.isEnabled()) {
            return handleDisabledLlmsRequest(req, res, next, resourcePath);
        }

        let resource;
        try {
            resource = urlService.getResource(resourcePath);
        } catch (err) {
            return next(err);
        }

        if (!resource || !['posts', 'pages'].includes(resource.config.type) || resource.data.visibility !== 'public') {
            return next();
        }

        try {
            const entry = await llmsService.fetchPublicEntry(resource.config.type, resource.data.id, req.member || null);

            if (!entry) {
                return next();
            }

            setMarkdownHeaders(res, 'text/markdown');
            res.set('Content-Location', getMarkdownPath(new URL(entry.url).pathname));
            return res.send(renderEntryMarkdown(entry));
        } catch (err) {
            return next(err);
        }
    });
}

module.exports = mountLlmsRoutes;
module.exports.mountMarkdownRoutes = mountMarkdownRoutes;
