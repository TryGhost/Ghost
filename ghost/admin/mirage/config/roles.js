export default function mockRoles(server) {
    server.get('/roles/', function ({roles}, {queryParams}) {
        if (queryParams.permissions === 'assign') {
            return roles.find([1, 2, 3, 5, 6]);
        }

        return roles.all();
    });
}
