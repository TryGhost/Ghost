import SearchIndex, {tokenizeCjkByCodePoint} from './search-index';
import nock from 'nock';

describe('search index', function () {
    test('initializes search index', async () => {
        const adminUrl = 'http://localhost:3000';
        const apiKey = '69010382388f9de5869ad6e558';
        const searchIndex = new SearchIndex({adminUrl, apiKey, storage: localStorage});

        const scope = nock('http://localhost:3000/ghost/api/content')
            .get('/search-index/posts/?key=69010382388f9de5869ad6e558')
            .reply(200, {
                posts: []
            })
            .get('/search-index/authors/?key=69010382388f9de5869ad6e558')
            .reply(200, {
                authors: []
            })
            .get('/search-index/tags/?key=69010382388f9de5869ad6e558')
            .reply(200, {
                tags: []
            });

        await searchIndex.init();

        expect(scope.isDone()).toBeTruthy();

        const searchResults = searchIndex.search('find nothing');

        expect(searchResults.posts.length).toEqual(0);
        expect(searchResults.authors.length).toEqual(0);
        expect(searchResults.tags.length).toEqual(0);
    });

    test('allows to search for indexed posts and authors', async () => {
        const adminUrl = 'http://localhost:3000';
        const apiKey = '69010382388f9de5869ad6e558';
        const searchIndex = new SearchIndex({adminUrl, apiKey, storage: localStorage});

        nock('http://localhost:3000/ghost/api/content')
            .get('/search-index/posts/?key=69010382388f9de5869ad6e558')
            .reply(200, {
                posts: [{
                    id: 'sounique',
                    title: 'Awesome Barcelona Life',
                    excerpt: 'We are sitting by the pool and smashing out search features. Barcelona life at 59 is great!',
                    url: 'http://localhost/ghost/awesome-barcelona-life/'
                }]
            })
            .get('/search-index/authors/?key=69010382388f9de5869ad6e558')
            .reply(200, {
                authors: [{
                    id: 'different_uniq',
                    slug: 'barcelona-author',
                    name: 'Barcelona Author',
                    profile_image: 'https://url_to_avatar/barcelona.png',
                    url: 'http://localhost/ghost/authors/barcelona-author/'
                }, {
                    id: 'different_uniq_2',
                    slug: 'bob',
                    name: 'Bob',
                    profile_image: 'https://url_to_avatar/barcelona.png',
                    url: 'http://localhost/ghost/authors/bob/'
                }]
            })
            .get('/search-index/tags/?key=69010382388f9de5869ad6e558')
            .reply(200, {
                tags: [{
                    id: 'uniq_tag',
                    slug: 'barcelona-tag',
                    name: 'Barcelona Tag',
                    url: 'http://localhost/ghost/tags/barcelona-tag/'
                }]
            });
        
        await searchIndex.init();

        let searchResults = searchIndex.search('Barcelo');
        expect(searchResults.posts.length).toEqual(1);
        expect(searchResults.posts[0].title).toEqual('Awesome Barcelona Life');
        expect(searchResults.posts[0].url).toEqual('http://localhost/ghost/awesome-barcelona-life/');

        expect(searchResults.authors.length).toEqual(1);
        expect(searchResults.authors[0].name).toEqual('Barcelona Author');
        expect(searchResults.authors[0].url).toEqual('http://localhost/ghost/authors/barcelona-author/');
        expect(searchResults.authors[0].profile_image).toEqual('https://url_to_avatar/barcelona.png');

        expect(searchResults.tags.length).toEqual(1);
        expect(searchResults.tags[0].name).toEqual('Barcelona Tag');
        expect(searchResults.tags[0].url).toEqual('http://localhost/ghost/tags/barcelona-tag/');

        searchResults = searchIndex.search('Nothing like this');
        expect(searchResults.posts.length).toEqual(0);
        expect(searchResults.authors.length).toEqual(0);
        expect(searchResults.tags.length).toEqual(0);

        searchResults = searchIndex.search('59');
        expect(searchResults.posts.length).toEqual(1);
        expect(searchResults.posts[0].title).toEqual('Awesome Barcelona Life');

        searchResults = searchIndex.search('12');
        expect(searchResults.posts.length).toEqual(0);

        // confirms that search works in the forward direction for ltr languages:
        let searchWithStartResults = searchIndex.search('Barce');
        expect(searchWithStartResults.posts.length).toEqual(1);

        let searchWithEndResults = searchIndex.search('celona');
        expect(searchWithEndResults.posts.length).toEqual(0);
    });

    test('searching works when dir = rtl also', async () => {
        const adminUrl = 'http://localhost:3000';
        const apiKey = '69010382388f9de5869ad6e558';
        const searchIndex = new SearchIndex({adminUrl, apiKey, dir: 'ltr', storage: localStorage});

        nock('http://localhost:3000/ghost/api/content')
            .get('/search-index/posts/?key=69010382388f9de5869ad6e558')
            .reply(200, {
                posts: [{
                    id: 'sounique',
                    title: 'أُظهر المثابرة كل يوم',
                    excerpt: 'أظهر المثابرة كل يوم. كتابة الاختبارات تحدٍ كبير!',
                    url: 'http://localhost/ghost/awesome-barcelona-life/'
                },
                {
                    id: 'sounique2',
                    title: 'هذا منشور عن السعادة',
                    excerpt: 'هذا منشور عن السعادة. لا يتطابق مع استعلام البحث.',
                    url: 'http://localhost/ghost/awesome-barcelona-life2/'
                }]
            })
            .get('/search-index/authors/?key=69010382388f9de5869ad6e558')
            .reply(200, {
                authors: [{
                    id: 'different_uniq',
                    slug: 'barcelona-author',
                    name: 'اسمي المثابرة',
                    profile_image: 'https://url_to_avatar/barcelona.png',
                    url: 'http://localhost/ghost/authors/barcelona-author/'
                }, {
                    id: 'different_uniq_2',
                    slug: 'bob',
                    name: 'Bob',
                    profile_image: 'https://url_to_avatar/barcelona.png',
                    url: 'http://localhost/ghost/authors/bob/'
                }]
            })
            .get('/search-index/tags/?key=69010382388f9de5869ad6e558')
            .reply(200, {
                tags: [{
                    id: 'uniq_tag',
                    slug: 'barcelona-tag',
                    name: 'المثابرة',
                    url: 'http://localhost/ghost/tags/barcelona-tag/'
                }]
            });
        
        await searchIndex.init();

        let searchResults = searchIndex.search('المثابرة');
        expect(searchResults.posts.length).toEqual(1);
        expect(searchResults.posts[0].title).toEqual('أُظهر المثابرة كل يوم');
        expect(searchResults.posts[0].url).toEqual('http://localhost/ghost/awesome-barcelona-life/');

        expect(searchResults.authors.length).toEqual(1);
        expect(searchResults.authors[0].name).toEqual('اسمي المثابرة');
        expect(searchResults.authors[0].url).toEqual('http://localhost/ghost/authors/barcelona-author/');
        expect(searchResults.authors[0].profile_image).toEqual('https://url_to_avatar/barcelona.png');

        expect(searchResults.tags.length).toEqual(1);
        expect(searchResults.tags[0].name).toEqual('المثابرة');
        expect(searchResults.tags[0].url).toEqual('http://localhost/ghost/tags/barcelona-tag/');

        searchResults = searchIndex.search('Nothing like this');
        expect(searchResults.posts.length).toEqual(0);
        expect(searchResults.authors.length).toEqual(0);
        expect(searchResults.tags.length).toEqual(0);

        let searchWithStartResults = searchIndex.search('المثا');
        expect(searchWithStartResults.posts.length).toEqual(1);
        expect(searchWithStartResults.posts[0].title).toEqual('أُظهر المثابرة كل يوم');

        let searchWithEndResults = searchIndex.search('ثابرة');
        expect(searchWithEndResults.posts.length).toEqual(0);
    });

    test('searching handles CJK characters correctly', async () => {
        const adminUrl = 'http://localhost:3000';
        const apiKey = '69010382388f9de5869ad6e558';
        const searchIndex = new SearchIndex({adminUrl, apiKey, dir: 'ltr', storage: localStorage});

        nock('http://localhost:3000/ghost/api/content')
            .get('/search-index/posts/?key=69010382388f9de5869ad6e558')
            .reply(200, {
                posts: [{
                    id: 'sounique',
                    title: '接收電子報 Regisztráljon fizetős',
                    excerpt: '要是系統發送電子報時遇到永久失敗的情形，English 該帳號將停止接收電子報 Regisztráljon fizetős fiókot  يتطابق  a  المثابرة كل يوم hozzásćzólások írásához あなたのリクエストはこのサイトの管理者に送信されます。Пријавете го овој коментар Dołączdo płatnej społeczności {{publication}}, by zaąćcąć komećantować. vietnamese: Yêu cầu nhà cung cấp dịch vụ email hỗ trợ bengali: নিউরো সার্জন',
                    url: 'http://localhost/ghost/visting-china-as-a-polyglot/'
                },
                {
                    id: 'sounique2',
                    title: 'هذا منشور عن السعادة',
                    excerpt: 'هذا منشور عن السعادة. لا يتطابق مع استعلام البحث.',
                    url: 'http://localhost/ghost/a-post-in-arabic/'
                },
                {
                    id: 'sounique3',
                    title: '毅力和运气',
                    excerpt: '凭借运气和毅力，Cathy 将通过所有测试。',
                    url: 'http://localhost/ghost/a-post-in-chinese/'
                }]
            })
            .get('/search-index/authors/?key=69010382388f9de5869ad6e558')
            .reply(200, {
                authors: [{
                    id: 'different_uniq',
                    slug: 'barcelona-author',
                    name: 'Barcelona Author',
                    profile_image: 'https://url_to_avatar/barcelona.png',
                    url: 'http://localhost/ghost/authors/barcelona-author/'
                }, {
                    id: 'different_uniq_2',
                    slug: 'bob',
                    name: 'Bob',
                    profile_image: 'https://url_to_avatar/barcelona.png',
                    url: 'http://localhost/ghost/authors/bob/'
                }]
            })
            .get('/search-index/tags/?key=69010382388f9de5869ad6e558')
            .reply(200, {
                tags: [{
                    id: 'uniq_tag',
                    slug: 'barcelona-tag',
                    name: 'Barcelona Tag',
                    url: 'http://localhost/ghost/tags/barcelona-tag/'
                }]
            });
            
        await searchIndex.init();

        let searchResults = searchIndex.search('Regisztrálj');
        expect(searchResults.posts.length).toEqual(1);
        expect(searchResults.posts[0].url).toEqual('http://localhost/ghost/visting-china-as-a-polyglot/');

        // search without accents (for a term with them)
        searchResults = searchIndex.search('Regisztralj');
        expect(searchResults.posts.length).toEqual(1);
        expect(searchResults.posts[0].url).toEqual('http://localhost/ghost/visting-china-as-a-polyglot/');      

        searchResults = searchIndex.search('Nothing like this');
        expect(searchResults.posts.length).toEqual(0);

        searchResults = searchIndex.search('報');
        expect(searchResults.posts.length).toEqual(1);
        expect(searchResults.posts[0].url).toEqual('http://localhost/ghost/visting-china-as-a-polyglot/');

        // out of order Chinese:
        searchResults = searchIndex.search('接子收電');
        expect(searchResults.posts.length).toEqual(1);
        expect(searchResults.posts[0].url).toEqual('http://localhost/ghost/visting-china-as-a-polyglot/');

        // out of order English:
        searchResults = searchIndex.search('glenish');
        expect(searchResults.posts.length).toEqual(0);
    });

    test('searching handles hebrew characters correctly', async () => {
        const adminUrl = 'http://localhost:3000';
        const apiKey = '69010382388f9de5869ad6e558';
        const searchIndex = new SearchIndex({adminUrl, apiKey, storage: localStorage});

        nock('http://localhost:3000/ghost/api/content')
            .get('/search-index/posts/?key=69010382388f9de5869ad6e558')
            .reply(200, {
                posts: [{
                    id: 'post',
                    title: 'חדשות ניו יורק',
                    excerpt: 'לורם איפסום דולור סיט אמט, קונסקטורר אדיפיסינג אלית סחטיר בלובק',
                    url: 'http://localhost/ghost/khdshvt-nyv-yvrq/'
                }]
            })
            .get('/search-index/authors/?key=69010382388f9de5869ad6e558')
            .reply(200, {
                authors: [{
                    id: 'author',
                    slug: 'svpr',
                    name: 'סופר',
                    url: 'http://localhost/ghost/authors/svpr/'
                }]
            })
            .get('/search-index/tags/?key=69010382388f9de5869ad6e558')
            .reply(200, {
                tags: [{
                    id: 'tag',
                    slug: 'khdshvt',
                    name: 'חדשות',
                    url: 'http://localhost/ghost/tags/khdshvt/'
                }]
            });
            
        await searchIndex.init();

        let searchResults = searchIndex.search('ניו יורק');
        expect(searchResults.posts.length).toEqual(1);
        expect(searchResults.posts[0].url).toEqual('http://localhost/ghost/khdshvt-nyv-yvrq/');

        searchResults = searchIndex.search('Nothing like this');
        expect(searchResults.posts.length).toEqual(0);

        searchResults = searchIndex.search('קונסקט');
        expect(searchResults.posts.length).toEqual(1);
        expect(searchResults.posts[0].url).toEqual('http://localhost/ghost/khdshvt-nyv-yvrq/');
        
        // check that stemming doesn't happen from the wrong end of the word also.
        searchResults = searchIndex.search('קטורר');
        expect(searchResults.posts.length).toEqual(0);

        searchResults = searchIndex.search('סופר');
        expect(searchResults.authors.length).toEqual(1);
        expect(searchResults.authors[0].url).toEqual('http://localhost/ghost/authors/svpr/');
         
        searchResults = searchIndex.search('חדשות');
        expect(searchResults.posts.length).toEqual(1);
        expect(searchResults.posts[0].title).toEqual('חדשות ניו יורק');
        expect(searchResults.tags.length).toEqual(1);
        expect(searchResults.tags[0].name).toEqual('חדשות');
        expect(searchResults.tags[0].url).toEqual('http://localhost/ghost/tags/khdshvt/');
    });
    test('unit tests for cjkEncoderPresetCodepoint', () => {
        expect(tokenizeCjkByCodePoint('')).toEqual([]);
        expect(tokenizeCjkByCodePoint('a')).toEqual(['a']);
        expect(tokenizeCjkByCodePoint('abc')).toEqual(['abc']);
        // I've left an accent in the test set, but it would be stripped by the default.charset process.
        expect(tokenizeCjkByCodePoint('renée')).toEqual(['renée']);
        expect(tokenizeCjkByCodePoint('ורם')).toEqual(['ורם']);
        expect(tokenizeCjkByCodePoint('将通过所有测试。')).toEqual(['将', '通', '过', '所', '有', '测', '试', '。']);
        expect(tokenizeCjkByCodePoint('您好English您好')).toEqual(['您', '好', 'English', '您', '好']);
    });
    test('additional special characters & punctuation', async () => {
        const adminUrl = 'http://localhost:3000';
        const apiKey = '69010382388f9de5869ad6e558';
        const searchIndex = new SearchIndex({adminUrl, apiKey, dir: 'ltr', storage: localStorage});

        nock('http://localhost:3000/ghost/api/content')
            .get('/search-index/posts/?key=69010382388f9de5869ad6e558')
            .reply(200, {
                posts: [{
                    id: 'sounique',
                    title: 'All about #metoo and other hashtags',
                    excerpt: 'What is this hash tag thing, anyway?',
                    url: 'http://localhost/ghost/have-a-hash-tag/'
                },
                {
                    id: 'sounique2',
                    title: 'All about metoo and other hashtags without actual hashes',
                    excerpt: 'sitting on the porch, drinking a Dr. Pepper',
                    url: 'http://localhost/ghost/no-hashes-here/'
                },
                {
                    id: 'sounique3',
                    title: 'Why would you want to search for #something anyway?',
                    excerpt: 'Being lazy and drinking a dr pepper and eating Μπακλαβάς',
                    url: 'http://localhost/ghost/some-other-hash/'
                }]
            })
            .get('/search-index/authors/?key=69010382388f9de5869ad6e558')
            .reply(200, {
                authors: [{
                    id: 'different_uniq',
                    slug: 'barcelona-author',
                    name: 'Barcelona Author',
                    profile_image: 'https://url_to_avatar/barcelona.png',
                    url: 'http://localhost/ghost/authors/barcelona-author/'
                }, {
                    id: 'different_uniq_2',
                    slug: 'bob',
                    name: 'Bob',
                    profile_image: 'https://url_to_avatar/barcelona.png',
                    url: 'http://localhost/ghost/authors/bob/'
                }]
            })
            .get('/search-index/tags/?key=69010382388f9de5869ad6e558')
            .reply(200, {
                tags: [{
                    id: 'uniq_tag',
                    slug: 'barcelona-tag',
                    name: 'Barcelona Tag',
                    url: 'http://localhost/ghost/tags/barcelona-tag/'
                }]
            });
            
        await searchIndex.init();

        // # doesn't matter
        let searchResults = searchIndex.search('metoo');
        expect(searchResults.posts.length).toEqual(2);
        expect(searchResults.posts[0].url).toEqual('http://localhost/ghost/have-a-hash-tag/');
        expect(searchResults.posts[1].url).toEqual('http://localhost/ghost/no-hashes-here/');

        searchResults = searchIndex.search('#metoo');
        expect(searchResults.posts.length).toEqual(2);
        expect(searchResults.posts[0].url).toEqual('http://localhost/ghost/have-a-hash-tag/');
        expect(searchResults.posts[1].url).toEqual('http://localhost/ghost/no-hashes-here/');

        // # is stripped during normalization, so cannot be found by searching for it alone.
        searchResults = searchIndex.search('#');
        expect(searchResults.posts.length).toEqual(0);

        // periods don't matter
        searchResults = searchIndex.search('Dr. Pepper');
        expect(searchResults.posts.length).toEqual(2);

        searchResults = searchIndex.search('Dr Pepper');
        expect(searchResults.posts.length).toEqual(2);

        // accents don't matter
        searchResults = searchIndex.search('Dr. Peppér');
        expect(searchResults.posts.length).toEqual(2);

        // normalization is funny but we don't really need to test for it
        // searchResults = searchIndex.search('dr peper');
        // expect(searchResults.posts.length).toEqual(2);

        searchResults = searchIndex.search('Μπακλαβάς');
        expect(searchResults.posts.length).toEqual(1);
        expect(searchResults.posts[0].url).toEqual('http://localhost/ghost/some-other-hash/');
        searchResults = searchIndex.search('Baklava');
        expect(searchResults.posts.length).toEqual(0); // because search isn't magic
    });
});