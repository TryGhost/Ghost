export function enableActivityPub(server, enabled = true) {
    server.db.settings.findBy({key: 'social_web_enabled'})
        ? server.db.settings.update({key: 'social_web_enabled'}, {value: enabled})
        : server.create('setting', {
            key: 'social_web_enabled',
            value: enabled,
            group: 'social_web'
        });
}

export function disableActivityPub(server) {
    enableActivityPub(server, false);
}

export function mockActivityPubFollowerCount(server, followerCount = 42) {
    server.get('identities/', function () {
        return {
            identities: [
                {
                    token: 'test-token'
                }
            ]
        };
    });

    server.get('site', function () {
        return {
            site: {
                url: window.location.origin
            }
        };
    });

    const originalNamespace = server.namespace;

    server.namespace = '';

    server.get('.ghost/activitypub/v1/account/me', function () {
        return {
            followerCount
        };
    });

    server.namespace = originalNamespace;
}
