import SearchIndex from './search-index';
import nock from 'nock';

describe('search index', function () {
    afterEach(function () {
        localStorage.clear();
    });

    test('initializes search index', async () => {
        const apiUrl = 'http://localhost/ghost/api/content';
        const apiKey = 'secret_key';
        const searchIndex = new SearchIndex({apiUrl, apiKey, storage: localStorage});

        const scope = nock('http://localhost/ghost/api/content')
            .get('/posts/?key=secret_key&limit=all&fields=id,title,excerpt,url,updated_at,visibility&order=updated_at%20desc&formats=plaintext')
            .reply(200, {
                posts: [{}]
            });

        await searchIndex.init({apiUrl, apiKey});

        expect(scope.isDone()).toBeTruthy();
    });

    test('allows to search for indexed posts', async () => {
        const apiUrl = 'http://localhost/ghost/api/content';
        const apiKey = 'secret_key';
        const searchIndex = new SearchIndex({apiUrl, apiKey, storage: localStorage});

        nock('http://localhost/ghost/api/content')
            .get('/posts/?key=secret_key&limit=all&fields=id,title,excerpt,url,updated_at,visibility&order=updated_at%20desc&formats=plaintext')
            .reply(200, {
                posts: [{
                    id: 'sounique',
                    title: 'Amazing Barcelona Life',
                    plaintext: 'We are sitting by the pool and smashing out search features'
                }]
            });

        await searchIndex.init({apiUrl, apiKey});

        let searchResults = searchIndex.search('Barcelona');
        expect(searchResults.length).toEqual(1);

        searchResults = searchIndex.search('Nothing like this');
        expect(searchResults.length).toEqual(0);
    });
});
