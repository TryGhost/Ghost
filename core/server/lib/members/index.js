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
    sendEmail,
    siteConfig
}) {
    const {encodeToken, decodeToken, getPublicKeys} = Tokens({privateKey, publicKey, issuer});

    let subscriptions = new Subscriptions(paymentConfig);

    let users = Users({
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
            .then(() => {
                return users.get({id: signedin});
            })
            .then(member => encodeToken({
                sub: member.id,
                plans: member.subscriptions.map(sub => sub.plan),
                exp: member.subscriptions
                    .map(sub => sub.validUntil)
                    .reduce((a, b) => Math.min(a, b),
                        Math.floor((Date.now() / 1000) + (60 * 60 * 24 * 30))),
                aud: audience
            }))
            .then(token => res.end(token))
            .catch(handleError(403, res));
    });

    apiRouter.get('/config', (req, res) => {
        subscriptions.getAdapters()
            .then((adapters) => {
                return Promise.all(adapters.map((adapter) => {
                    return subscriptions.getPublicConfig(adapter);
                }));
            })
            .then(data => res.json({
                paymentConfig: data,
                siteConfig: siteConfig
            }))
            .catch(handleError(500, res));
    });

    /* security */
    function ssoOriginCheck(req, res, next) {
        if (!req.data.origin || req.data.origin !== ssoOrigin) {
            res.writeHead(403);
            return res.end();
        }
        next();
    }

    /* subscriptions */
    apiRouter.post('/subscription', getData('adapter', 'plan', 'stripeToken'), ssoOriginCheck, (req, res) => {
        const {signedin} = getCookie(req);
        if (!signedin) {
            res.writeHead(401, {
                'Set-Cookie': removeCookie()
            });
            return res.end();
        }

        const {plan, adapter, stripeToken} = req.data;

        subscriptions.getAdapters()
            .then((adapters) => {
                if (!adapters.includes(adapter)) {
                    throw new Error('Invalid adapter');
                }
            })
            .then(() => users.get({id: signedin}))
            .then((member) => {
                return subscriptions.createSubscription(member, {
                    adapter,
                    plan,
                    stripeToken
                });
            })
            .then(() => {
                res.end();
            })
            .catch(handleError(500, res));
    });

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
    httpHandler.reconfigureSettings = function (data) {
        subscriptions = new Subscriptions(data.paymentConfig);
        users = Users({
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
        siteConfig = data.siteConfig;
    };

    return httpHandler;
};
