const {Router, static} = require('express');
const cookie = require('cookie');
const body = require('body-parser');
const jwt = require('jsonwebtoken');

module.exports = function MembersApi({createMember}) {
    const router = Router();

    const apiRouter = Router();

    apiRouter.post('/token', (req, res) => {
        const {signedin} = cookie.parse(req.headers.cookie);
        if (!signedin) {
            res.writeHead(401);
            return res.end();
        }
        const token = jwt.sign({}, null, {algorithm: 'none'});
        return res.end(token);
    });

    apiRouter.post('/signup', body.json(), (req, res) => {
        if (!req.body || !req.body.email || !req.body.password) {
            res.writeHead(400);
            return res.end();
        }
        const {email, password} = req.body;
        createMember(email, password)
            .then((model) => {
                res.json(model);
            }).catch((err) => {
                res.json(err);
            });
    });

    apiRouter.post('/signin', body.json(), (req, res) => {
        if (!req.body || !req.body.email || !req.body.password) {
            res.writeHead(400);
            return res.end();
        }
        if (req.body.email !== 'member@member.com' || req.body.password !== 'hunter2') {
            res.writeHead(401);
            return res.end();
        }
        res.writeHead(200, {
            'Set-Cookie': cookie.serialize('signedin', true, {
                maxAge: 180,
                path: '/ghost/api/v2/members/token',
                sameSite: 'strict',
                httpOnly: true
            })
        });
        res.end();
    });

    apiRouter.post('/signout', (req, res) => {
        res.writeHead(200, {
            'Set-Cookie': cookie.serialize('signedin', false, {
                maxAge: 0,
                path: '/ghost/api/v2/members/token',
                sameSite: 'strict',
                httpOnly: true
            })
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
