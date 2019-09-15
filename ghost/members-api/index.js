const {Router} = require('express');
const body = require('body-parser');
const MagicLink = require('@tryghost/magic-link');
const StripePaymentProcessor = require('./lib/stripe');

const Tokens = require('./lib/tokens');
const Users = require('./lib/users');
const common = require('./lib/common');

module.exports = function MembersApi({
    tokenConfig: {
        issuer,
        privateKey,
        publicKey
    },
    auth: {
        getSigninURL
    },
    paymentConfig,
    mail: {
        transporter
    },
    createMember,
    getMember,
    deleteMember,
    listMembers
}) {
    const {encodeIdentityToken, decodeToken} = Tokens({privateKey, publicKey, issuer});

    const stripe = paymentConfig.stripe ? new StripePaymentProcessor(paymentConfig.stripe) : null;

    async function ensureStripe(_req, res, next) {
        if (!stripe) {
            res.writeHead(400);
            return res.end('Stripe not configured');
        }
        try {
            await stripe.ready();
            next();
        } catch (err) {
            res.writeHead(500);
            return res.end('There was an error configuring stripe');
        }
    }

    let users = Users({
        stripe,
        createMember,
        getMember,
        deleteMember,
        listMembers
    });

    const magicLinkService = new MagicLink({
        transporter,
        publicKey,
        privateKey,
        getSigninURL
    });

    async function sendEmailWithMagicLink(email){
        return magicLinkService.sendMagicLink({email, user: {email}});
    }
    async function getMemberDataFromMagicLinkToken(token){
        const user = await magicLinkService.getUserFromToken(token);
        const email = user && user.email;
        if (!email) {
            return null;
        }
        const member = await getMemberIdentityData(email);
        if (member) {
            return member;
        }
        await users.create({email});
        return getMemberIdentityData(email);
    }
    async function getMemberIdentityData(email){
        return users.get({email});
    }
    async function getMemberIdentityToken(email){
        const member = await getMemberIdentityData(email);
        return encodeIdentityToken({sub: member.email});
    }

    const apiInstance = new Router();
    apiInstance.use(body.json());

    apiInstance.post('/send-magic-link', async function (req, res) {
        const email = req.body.email;
        if (!email) {
            res.writeHead(400);
            return res.end('Bad Request.');
        }
        try {
            await sendEmailWithMagicLink(email);
            res.writeHead(201);
            return res.end('Created.');
        } catch (err) {
            common.logging.error(err);
            res.writeHead(500);
            return res.end('Internal Server Error.');
        }
    });

    apiInstance.post('/create-stripe-checkout-session', ensureStripe, async function (req, res) {
        const plan = req.body.plan;
        const identity = req.body.identity;

        if (!plan || !identity) {
            res.writeHead(400);
            return res.end('Bad Request.');
        }

        let email;
        try {
            const claims = await decodeToken(identity);
            email = claims.sub;
        } catch (err) {
            res.writeHead(401);
            return res.end('Unauthorized');
        }

        const member = await users.get({email});

        // Do not allow members already with a plan to initiate a new checkout session
        if (member.plans.length > 0) {
            res.writeHead(403);
            return res.end('No permission');
        }

        const session = await stripe.createCheckoutSession(member, plan);

        res.writeHead(200, {
            'Content-Type': 'application/json'
        });

        res.end(JSON.stringify({
            sessionId: session.id,
            publicKey: stripe.getPublicConfig().publicKey
        }));
    });

    apiInstance.getMemberDataFromMagicLinkToken = getMemberDataFromMagicLinkToken;
    apiInstance.getMemberIdentityData = getMemberIdentityData;
    apiInstance.getMemberIdentityToken = getMemberIdentityToken;

    apiInstance.setLogger = common.logging.setLogger;

    apiInstance.getPublicConfig = function () {
        return Promise.resolve({
            publicKey,
            issuer
        });
    };

    apiInstance.members = users;
    apiInstance.bus = new (require('events').EventEmitter)();

    if (stripe) {
        stripe.ready().then(() => {
            apiInstance.bus.emit('ready');
        }).catch((err) => {
            apiInstance.bus.emit('error', err);
        });
    } else {
        process.nextTick(() => apiInstance.bus.emit('ready'));
    }

    return apiInstance;
};
