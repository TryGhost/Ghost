const {Router, static} = require('express');
const jwt = require('jsonwebtoken');

module.exports = function MembersApi() {
    const router = Router();

    const apiRouter = Router();

    apiRouter.post('/token', (req, res) => {
        const token = jwt.sign({}, null, {algorithm: 'none'});
        return res.end(token);
    });

    const staticRouter = Router();

    staticRouter.use(static(require('path').join(__dirname, './static')));

    router.use('/api', apiRouter);
    router.use('/static', staticRouter);

    function httpHandler(req, res, next) {
        return router.handle(req, res, next);
    }

    httpHandler.staticRouter = staticRouter;
    httpHandler.apiRouter = apiRouter;

    return httpHandler;
};
