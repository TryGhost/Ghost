const {Router} = require('express');
const body = require('body-parser');
const MagicLink = require('@tryghost/magic-link');

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
    mail: {
        transporter
    },
    createMember,
    getMember,
    deleteMember,
    listMembers
}) {
    const {encodeIdentityToken} = Tokens({privateKey, publicKey, issuer});

    let users = Users({
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
        return users.create({email});
    }
    async function getMemberIdentityData(email){
        return users.get(email);
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
            res.writeHead(500);
            return res.end('Internal Server Error.');
        }
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

    apiInstance.bus = new (require('events').EventEmitter)();
    process.nextTick(() => apiInstance.bus.emit('ready'));

    return apiInstance;
};
