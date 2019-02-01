const {Router, static} = require('express');
const body = require('body-parser');

const {getData, handleError} = require('./util');

const Cookies = require('./cookies');
const Tokens = require('./tokens');
const Users = require('./users');
const Subscriptions = require('./subscriptions');

module.exports = function MembersApi({
    authConfig: {
        issuer,
        privateKey,
        publicKey,
        sessionSecret,
        ssoOrigin
    },
    paymentConfig,
    validateAudience,
    createMember,
    validateMember,
    updateMember,
    getMember,
    listMembers,
    sendEmail
}) {
    const {encodeToken, decodeToken, getPublicKeys} = Tokens({privateKey, publicKey, issuer});

    const subscriptions = new Subscriptions(paymentConfig);

    const users = Users({
        subscriptions,
        createMember,
        updateMember,
        getMember,
        validateMember,
        sendEmail,
        encodeToken,
        listMembers,
        decodeToken
    });

    const router = Router();

    const apiRouter = Router();

    apiRouter.use(body.json());

    /* session */
    const {getCookie, setCookie, removeCookie} = Cookies(sessionSecret);

    /* token */
    apiRouter.post('/token', getData('audience'), (req, res) => {
        const {signedin} = getCookie(req);
        if (!signedin) {
            res.writeHead(401, {
                'Set-Cookie': removeCookie()
            });
            return res.end();
        }

        const {audience, origin} = req.data;

        validateAudience({audience, origin, id: signedin})
            .then(() => encodeToken({
                sub: signedin,
                aud: audience
            }))
            .then(token => res.end(token))
            .catch(handleError(403, res));
    });

    /* security */
    function ssoOriginCheck(req, res, next) {
        if (!req.data.origin || req.data.origin !== ssoOrigin) {
            res.writeHead(403);
            return res.end();
        }
        next();
    }

    /* users, token, emails */
    apiRouter.post('/request-password-reset', getData('email'), ssoOriginCheck, (req, res) => {
        const {email} = req.data;

        users.requestPasswordReset({email}).then(() => {
            res.writeHead(200);
            res.end();
        }).catch(handleError(500, res));
    });

    /* users, token */
    apiRouter.post('/reset-password', getData('token', 'password'), ssoOriginCheck, (req, res) => {
        const {token, password} = req.data;

        users.resetPassword({token, password}).then((member) => {
            res.writeHead(200, {
                'Set-Cookie': setCookie(member)
            });
            res.end();
        }).catch(handleError(401, res));
    });

    /* users, email */
    apiRouter.post('/signup', getData('name', 'email', 'password'), ssoOriginCheck, (req, res) => {
        const {name, email, password} = req.data;

        // @TODO this should attempt to reset password before creating member
        users.create({name, email, password}).then((member) => {
            res.writeHead(200, {
                'Set-Cookie': setCookie(member)
            });
            res.end();
        }).catch(handleError(400, res));
    });

    /* users, session */
    apiRouter.post('/signin', getData('email', 'password'), ssoOriginCheck, (req, res) => {
        const {email, password} = req.data;

        users.validate({email, password}).then((member) => {
            res.writeHead(200, {
                'Set-Cookie': setCookie(member)
            });
            res.end();
        }).catch(handleError(401, res));
    });

    /* session */
    apiRouter.post('/signout', getData(), (req, res) => {
        res.writeHead(200, {
            'Set-Cookie': removeCookie()
        });
        res.end();
    });

    /* http */
    const staticRouter = Router();
    staticRouter.use('/static', static(require('path').join(__dirname, './static/auth/dist')));
    staticRouter.use('/gateway', static(require('path').join(__dirname, './static/gateway')));
    staticRouter.get('/*', (req, res) => {
        res.sendFile(require('path').join(__dirname, './static/auth/dist/index.html'));
    });

    /* http */
    router.use('/api', apiRouter);
    router.use('/static', staticRouter);
    /* token */
    router.get('/.well-known/jwks.json', (req, res) => {
        getPublicKeys().then((jwks) => {
            res.json(jwks);
        });
    });

    function httpHandler(req, res, next) {
        return router.handle(req, res, next);
    }

    httpHandler.staticRouter = staticRouter;
    httpHandler.apiRouter = apiRouter;
    httpHandler.memberUserObject = users;

    return httpHandler;
};
