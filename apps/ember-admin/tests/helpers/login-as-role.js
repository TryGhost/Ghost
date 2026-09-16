import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';

export default async function loginAsRole(roleName, server) {
    const role = server.create('role', {name: roleName});
    const user = server.create('user', {roles: [role], slug: 'test-user'});
    await invalidateSession();
    await authenticateSession();

    return user;
}
