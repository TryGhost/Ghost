const {Router} = require('express');
const jwt = require('jsonwebtoken');

module.exports = function MembersApi() {
    const router = Router();

    router.post('/secure/token', (req, res) => {
        const token = jwt.sign({}, null, {algorithm: 'none'});
        return res.end(token);
    });

    return function httpHandler(req, res, next) {
        return router.handle(req, res, next);
    };
};
