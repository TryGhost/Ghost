import assert from 'assert/strict';
import got from 'got';
import nock from 'nock';
import {RecommendationMetadataService} from '../../../../../../core/server/services/recommendations/service';
import sinon from 'sinon';

describe('RecommendationMetadataService', function () {
    let service: RecommendationMetadataService;
    let fetchOembedDataFromUrl: sinon.SinonStub;

    beforeEach(function () {
        nock.disableNetConnect();
        fetchOembedDataFromUrl = sinon.stub().resolves({
            version: '1.0',
            type: 'webmention',
            metadata: {
                title: 'Oembed Site Title',
                description: 'Oembed Site Description',
                publisher: 'Oembed Site Publisher',
                author: 'Oembed Site Author',
                thumbnail: 'https://example.com/oembed/thumbnail.png',
                icon: 'https://example.com/oembed/icon.png'
            }
        });
        service = new RecommendationMetadataService({
            externalRequest: got,
            oembedService: {
                fetchOembedDataFromUrl
            }
        });
    });

    afterEach(function () {
        nock.cleanAll();
        sinon.restore();
    });

    it('Returns metadata from the Ghost site', async function () {
        nock('https://exampleghostsite.com')
            .get('/subdirectory/members/api/site')
            .reply(200, {
                site: {
                    title: 'Example Ghost Site',
                    description: 'Example Ghost Site Description',
                    cover_image: 'https://exampleghostsite.com/cover.png',
                    icon: 'https://exampleghostsite.com/favicon.ico',
                    allow_external_signup: true
                }
            });

        const metadata = await service.fetch(new URL('https://exampleghostsite.com/subdirectory'));
        assert.deepEqual(metadata, {
            title: 'Example Ghost Site',
            excerpt: 'Example Ghost Site Description',
            featuredImage: new URL('https://exampleghostsite.com/cover.png'),
            favicon: new URL('https://exampleghostsite.com/favicon.ico'),
            oneClickSubscribe: true
        });
    });

    it('Nulifies empty data from Ghost site response', async function () {
        nock('https://exampleghostsite.com')
            .get('/subdirectory/members/api/site')
            .reply(200, {
                site: {
                    title: '',
                    description: '',
                    cover_image: '',
                    icon: '',
                    allow_external_signup: false
                }
            });

        const metadata = await service.fetch(new URL('https://exampleghostsite.com/subdirectory'));
        assert.deepEqual(metadata, {
            title: null,
            excerpt: null,
            featuredImage: null,
            favicon: null,
            oneClickSubscribe: false
        });
    });

    it('Ignores ghost site if allow_external_signup is missing', async function () {
        nock('https://exampleghostsite.com')
            .get('/members/api/site')
            .reply(200, {
                site: {
                    title: '',
                    description: '',
                    cover_image: '',
                    icon: ''
                }
            });

        const metadata = await service.fetch(new URL('https://exampleghostsite.com'));
        assert.deepEqual(metadata, {
            // oembed
            title: 'Oembed Site Title',
            excerpt: 'Oembed Site Description',
            featuredImage: new URL('https://example.com/oembed/thumbnail.png'),
            favicon: new URL('https://example.com/oembed/icon.png'),
            oneClickSubscribe: false
        });
    });

    it('Returns metadata from the Ghost site root if not found on subdirectory', async function () {
        nock('https://exampleghostsite.com')
            .get('/subdirectory/members/api/site')
            .reply(404, {});

        nock('https://exampleghostsite.com')
            .get('/members/api/site')
            .reply(200, {
                site: {
                    title: 'Example Ghost Site',
                    description: 'Example Ghost Site Description',
                    cover_image: 'https://exampleghostsite.com/cover.png',
                    icon: 'https://exampleghostsite.com/favicon.ico',
                    allow_external_signup: true
                }
            });

        const metadata = await service.fetch(new URL('https://exampleghostsite.com/subdirectory'));
        assert.deepEqual(metadata, {
            title: 'Example Ghost Site',
            excerpt: 'Example Ghost Site Description',
            featuredImage: new URL('https://exampleghostsite.com/cover.png'),
            favicon: new URL('https://exampleghostsite.com/favicon.ico'),
            oneClickSubscribe: true
        });
    });

    it('Skips ghost metadata if json is invalid', async function () {
        nock('https://exampleghostsite.com')
            .get('/subdirectory/members/api/site')
            .reply(200, 'invalidjson');

        nock('https://exampleghostsite.com')
            .get('/members/api/site')
            .reply(200, 'invalidjson');

        const metadata = await service.fetch(new URL('https://exampleghostsite.com/subdirectory'));
        assert.deepEqual(metadata, {
            title: 'Oembed Site Title',
            excerpt: 'Oembed Site Description',
            featuredImage: new URL('https://example.com/oembed/thumbnail.png'),
            favicon: new URL('https://example.com/oembed/icon.png'),
            oneClickSubscribe: false
        });
    });

    it('Ignores invalid urls', async function () {
        nock('https://exampleghostsite.com')
            .get('/subdirectory/members/api/site')
            .reply(404, 'invalidjson');

        nock('https://exampleghostsite.com')
            .get('/members/api/site')
            .reply(404, 'invalidjson');

        fetchOembedDataFromUrl.resolves({
            version: '1.0',
            type: 'webmention',
            metadata: {
                title: 'Oembed Site Title',
                description: 'Oembed Site Description',
                publisher: 'Oembed Site Publisher',
                author: 'Oembed Site Author',
                thumbnail: 'invalid',
                icon: 'invalid'
            }
        });

        const metadata = await service.fetch(new URL('https://exampleghostsite.com/subdirectory'));
        assert.deepEqual(metadata, {
            title: 'Oembed Site Title',
            excerpt: 'Oembed Site Description',
            featuredImage: null,
            favicon: null,
            oneClickSubscribe: false
        });
    });

    it('does not throw an error even if fetching throws an error', async function () {
        // TODO: simulate DNS resolution failures if possible
        sinon.stub(got, 'get').rejects(new Error('Failed to fetch'));

        await service.fetch(new URL('https://exampleghostsite.com/subdirectory'));
    });

    it('Nullifies empty oembed data', async function () {
        nock('https://exampleghostsite.com')
            .get('/subdirectory/members/api/site')
            .reply(404, 'invalidjson');

        nock('https://exampleghostsite.com')
            .get('/members/api/site')
            .reply(404, 'invalidjson');

        fetchOembedDataFromUrl.resolves({
            version: '1.0',
            type: 'webmention',
            metadata: {
                title: '',
                description: '',
                publisher: '',
                author: '',
                thumbnail: '',
                icon: ''
            }
        });

        const metadata = await service.fetch(new URL('https://exampleghostsite.com/subdirectory'));
        assert.deepEqual(metadata, {
            title: null,
            excerpt: null,
            featuredImage: null,
            favicon: null,
            oneClickSubscribe: false
        });
    });
});
