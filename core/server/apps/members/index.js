const membersService = require('../../services/members');
const labs = require('../../services/labs');

module.exports = {
    activate() {},

    setupMiddleware(router) {
        if (labs.isSet('members')) {
            router.use('/members', membersService.api.staticRouter);
        }
    }
};
