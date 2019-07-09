const {Router} = require('express');
const body = require('body-parser');

const {getData, handleError} = require('./lib/util');

const Cookies = require('./lib/cookies');
const Tokens = require('./lib/tokens');
const Users = require('./lib/users');
const Subscriptions = require('./lib/subscriptions');

module.exports = function MembersApi({
    authConfig: {
        issuer,
        privateKey,
        publicKey,
        sessionSecret,
        ssoOrigin,
        accessControl
    },
    paymentConfig,
    createMember,
    validateMember,
    updateMember,
    getMember,
    deleteMember,
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
        deleteMember,
        validateMember,
        sendEmail,
        encodeToken,
        listMembers,
        decodeToken
    });

    const apiRouter = Router();

    apiRouter.use(body.json());

    /* session */
    const {getCookie, setCookie, removeCookie} = Cookies(sessionSecret);

    function validateAccess({audience, origin}) {
        const audienceLookup = accessControl[origin] || {
            [origin]: accessControl['*']
        };

        const tokenSettings = audienceLookup[audience];

        if (tokenSettings) {
            return Promise.resolve(tokenSettings);
        }

        return Promise.reject();
    }

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

        validateAccess({audience, origin})
            .then(({tokenLength}) => {
                return users.get({id: signedin})
                    .then(member => encodeToken({
                        sub: member.id,
                        plans: member.plans,
                        exp: tokenLength,
                        aud: audience
                    }));
            })
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
            .then(paymentConfig => res.json({
                paymentConfig,
                issuer,
                siteConfig
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
    apiRouter.post('/subscription', getData('adapter', 'plan', 'stripeToken', {name: 'coupon', required: false}), ssoOriginCheck, (req, res) => {
        const {signedin} = getCookie(req);
        if (!signedin) {
            res.writeHead(401, {
                'Set-Cookie': removeCookie()
            });
            return res.end();
        }

        const {plan, adapter, stripeToken, coupon} = req.data;

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
                    stripeToken,
                    coupon
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
    staticRouter.get('/gateway', (req, res) => {
        res.status(200).send(`
            <script>
                window.membersApiUrl = "${issuer}";
            </script>
            <script src="bundle.js"></script>
        `);
    });
    staticRouter.get('/bundle.js', (req, res) => {
        res.status(200).sendFile(require('path').join(__dirname, './gateway/bundle.js'));
    });

    const apiInstance = new Router();

    apiInstance.use(apiRouter);
    apiInstance.use('/static', staticRouter);

    apiInstance.apiRouter = apiRouter;
    apiInstance.staticRouter = staticRouter;

    apiInstance.members = users;
    apiInstance.getPublicKeys = getPublicKeys;
    apiInstance.getPublicConfig = function () {
        return Promise.resolve({
            publicKey,
            issuer
        });
    };
    apiInstance.getMember = function (id, token) {
        return decodeToken(token).then(() => {
            return users.get({id});
        });
    };
    apiInstance.reconfigureSettings = function (data) {
        subscriptions = new Subscriptions(data.paymentConfig);
        users = Users({
            subscriptions,
            createMember,
            updateMember,
            getMember,
            deleteMember,
            validateMember,
            sendEmail,
            encodeToken,
            listMembers,
            decodeToken
        });
        siteConfig = data.siteConfig;
    };

    return apiInstance;
};
