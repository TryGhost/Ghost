export default function mockRoles(server) {
    server.get('/roles/', function (db, request) {
        if (request.queryParams.permissions === 'assign') {
            let roles = db.roles.find([1,2,3]);
            return {roles};
        }

        return {
            roles: db.roles
        };
    });
}
