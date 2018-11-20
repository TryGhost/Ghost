const MembersApi = require('../../lib/members');

let membersApi;

module.exports = {
    activate(ghost) {
        membersApi = MembersApi();
        ghost.routeService.registerRouter('/app/members/', membersApi);
    }
};
