import {dasherize} from '@ember/string';

export default function mockSlugs(server) {
    server.get('/slugs/post/:slug/', function (schema, request) {
        return {
            slugs: [
                {slug: dasherize(decodeURIComponent(request.params.slug))}
            ]
        };
    });

    server.get('/slugs/post/:slug/:id', function (schema, request) {
        return {
            slugs: [
                {slug: dasherize(decodeURIComponent(request.params.slug))}
            ]
        };
    });

    server.get('/slugs/user/:slug/', function (schema, request) {
        return {
            slugs: [
                {slug: dasherize(decodeURIComponent(request.params.slug))}
            ]
        };
    });
}
