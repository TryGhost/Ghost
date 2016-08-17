import Ember from 'ember';

const {
    String: {dasherize}
} = Ember;

export default function mockSlugs(server) {
    server.get('/slugs/post/:slug/', function (db, request) {
        return {
            slugs: [
                {slug: dasherize(decodeURIComponent(request.params.slug))}
            ]
        };
    });

    server.get('/slugs/user/:slug/', function (db, request) {
        return {
            slugs: [
                {slug: dasherize(decodeURIComponent(request.params.slug))}
            ]
        };
    });
}
