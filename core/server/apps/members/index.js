const MembersApi = require('../../lib/members');

module.exports = {
    activate(ghost) {
        const membersApi = MembersApi();
        ghost.routeService.registerRouter('/app/members/', membersApi);
    }
};
