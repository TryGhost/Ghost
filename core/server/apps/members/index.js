const membersService = require('../../services/members');

module.exports = {
    activate() {},

    setupMiddleware(router) {
        router.use('/members', membersService.api.staticRouter);
    }
};
