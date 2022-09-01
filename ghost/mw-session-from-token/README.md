# Session From Token Middleware

Middleware to handle generating sessions from tokens, for example like with magic links, or SSO flows similar to SAML.

## Usage

```js
const sessionFromTokenMiddleware = require('@tryghost/mw-session-from-token')({
    callNextWithError: true,
    async createSession(req, res, user) {
        req.session.user_id = user.id;
    },
    async getTokenFromRequest(res) {
        return req.headers['some-cool-header'];
    },
    async getLookupFromToken(token) {
        await someTokenService.validate(token);
        const data = await someTokenService.getData(token);
        return data.email;
    },
    async findUserByLookup(lookup) {
        return await someUserModel.findOne({email: lookup});
    }
});

someExpressApp.get('/some/sso/url', someSessionMiddleware, sessionFromTokenMiddleware, (req, res, next) => {
    res.redirect('/loggedin');
}, (err, res, res, next) => {
    res.redirect('/error');
});
```
