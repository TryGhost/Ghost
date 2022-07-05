import {init} from './search-index';
import nock from 'nock';

describe('search index', function () {
    test('initializes search index', async () => {
        const apiUrl = 'http://localhost/ghost/api/content';
        const apiKey = 'secret_key';

        const scope = nock('http://localhost/ghost/api/content')
            .get('/posts/?key=secret_key&limit=all&fields=id,title,excerpt,url,updated_at,visibility&order=updated_at%20desc&formats=plaintext')
            .reply(200, {
                posts: [{}]
            });

        await init({apiUrl, apiKey});

        expect(scope.isDone()).toBeTruthy();
    });
});
