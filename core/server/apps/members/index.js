const MembersApi = require('../../lib/members');

module.exports = {
    activate() {},

    setupMiddleware(router) {
        const membersApi = MembersApi();
        router.use('/members', membersApi.staticRouter);
    }
};
