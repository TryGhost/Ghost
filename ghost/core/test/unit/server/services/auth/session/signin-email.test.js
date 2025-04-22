const signinEmail = require('../../../../../../core/server/services/auth/session/emails/signin');

const t = s => s;

const baseDetails = {
    siteTitle: 'Example Site',
    email: 'test@example.com',
    siteDomain: 'blog.example.com',
    siteUrl: 'https://blog.example.com',
    siteLogo: 'https://blog.example.com/logo.png',
    deviceDetails: 'Test Details',
    token: '123456',
    t
};

describe('signin-email', function () {
    it('Displays the "new device" text when is2FARequired is false', function () {
        const emailText = signinEmail(Object.assign({}, baseDetails, {is2FARequired: false}));
        emailText.should.match(/You just tried to access your account from a new device/);
    });

    it('Does not display the "new device" text when is2FARequired is true', function () {
        const emailText = signinEmail(Object.assign({}, baseDetails, {is2FARequired: true}));
        emailText.should.not.match(/You just tried to access your account from a new device/);
    });
});
