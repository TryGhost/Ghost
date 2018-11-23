const {Router, static} = require('express');
const jwt = require('jsonwebtoken');

module.exports = function MembersApi() {
    const router = Router();

    const apiRouter = Router();

    apiRouter.post('/token', (req, res) => {
        const token = jwt.sign({}, null, {algorithm: 'none'});
        return res.end(token);
    });

    apiRouter.post('/signin', (req, res) => {
        res.writeHead(200, {
            'Set-Cookie': `signedin=true;HttpOnly;Max-Age=180;Path=/ghost/api/v2/members/token`
        });
        res.end();
    });

    apiRouter.post('/signout', (req, res) => {
        res.writeHead(200, {
            'Set-Cookie': `signedin=false;HttpOnly;Max-Age=-1;Path=/ghost/api/v2/members/token`
        });
        res.end();
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
