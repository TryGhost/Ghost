const LinkRedirect = require('./LinkRedirect');

class LinkRedirectsService {
    /**
     * @param {URL} to
     *
     * @returns {Promise<LinkRedirect>}
     */
    async addRedirect(to) {
        const from = new URL(to);

        from.searchParams.set('redirected', 'true'); // Dummy for skateboard

        const link = new LinkRedirect({
            to,
            from
        });

        return link;
    }

    /**
     * @param {import('express').Request} req
     * @param {import('express').Response} res
     * @param {import('express').NextFunction} next
     *
     * @returns {Promise<void>}
     */
    async handleRequest(req, res, next) {
        return next();
    }
}

module.exports = LinkRedirectsService;
