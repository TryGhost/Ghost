const assert = require('node:assert/strict');
const sinon = require('sinon');
const EventEmitter = require('events');

const settingsCache = require('../../../../../core/shared/settings-cache');
const models = require('../../../../../core/server/models');
const urlService = require('../../../../../core/server/services/url');
const routing = require('../../../../../core/frontend/services/routing');
const {LlmsService} = require('../../../../../core/frontend/services/llms/service');

describe('Unit: frontend/services/llms/service', function () {
    let eventBus;
    let service;

    before(function () {
        models.init();
    });

    beforeEach(function () {
        eventBus = new EventEmitter();
        service = new LlmsService({events: eventBus, apiService: {}});

        sinon.stub(settingsCache, 'get').callsFake((key) => {
            const values = {
                description: 'Short description',
                is_private: false,
                meta_description: 'Meta description',
                title: 'Ghost Site'
            };

            return values[key];
        });

        sinon.stub(routing.registry, 'getRssUrl').returns('https://example.com/rss/');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('builds llms.txt with markdown URLs, stable page ordering, and truncated descriptions', async function () {
        const longDescription = 'A'.repeat(320);

        sinon.stub(models.Post, 'findPage').callsFake(async (options) => {
            if (options.filter.includes('type:page')) {
                return {
                    data: [
                        {toJSON: () => ({id: 'page-b', title: 'B Page', custom_excerpt: 'Second page'})},
                        {toJSON: () => ({id: 'page-a', title: 'A Page', custom_excerpt: 'First page'})}
                    ]
                };
            }

            return {
                data: [
                    {toJSON: () => ({id: 'post-a', title: 'Recent Post', custom_excerpt: longDescription})},
                    {toJSON: () => ({id: 'post-b', title: 'Older Post', plaintext: 'Older summary'})}
                ]
            };
        });

        sinon.stub(urlService, 'getUrlByResourceId').callsFake((id) => {
            const urls = {
                'page-a': 'https://example.com/about/',
                'page-b': 'https://example.com/contact/',
                'post-a': 'https://example.com/2026/04/recent-post/',
                'post-b': 'https://example.com/2026/03/older-post/'
            };

            return urls[id];
        });

        const llmsTxt = await service.getLlmsTxt();

        assert.match(llmsTxt, /^# Ghost Site/m);
        assert.match(llmsTxt, /^> Meta description/m);
        assert.match(llmsTxt, /## Pages[\s\S]*\[A Page\]\(https:\/\/example\.com\/about\.md\)[\s\S]*\[B Page\]\(https:\/\/example\.com\/contact\.md\)/m);
        assert.match(llmsTxt, /\[Recent Post\]\(https:\/\/example\.com\/2026\/04\/recent-post\.md\) - A{299}…/);
        assert.match(llmsTxt, /## Optional[\s\S]*\[RSS Feed\]\(https:\/\/example\.com\/rss\/\)/m);
        assert.match(llmsTxt, /\[Sitemap\]\(http:\/\/127\.0\.0\.1:\d+\/sitemap\.xml\)/);
    });

    it('bounds llms-full.txt at 5 MiB and appends a truncation note', async function () {
        sinon.stub(models.Post, 'findPage').callsFake(async (options) => {
            if (options.filter.includes('type:page')) {
                return {
                    data: [
                        {
                            toJSON: () => ({
                                id: 'page-a',
                                title: 'Large Page',
                                html: `<p>${'x'.repeat((5 * 1024 * 1024) + 1000)}</p>`,
                                plaintext: 'large page body',
                                updated_at: '2026-04-14T00:00:00.000Z'
                            })
                        }
                    ]
                };
            }

            return {
                data: [
                    {
                        toJSON: () => ({
                            id: 'post-a',
                            title: 'Post That Should Not Fit',
                            html: '<p>post body</p>',
                            plaintext: 'post body',
                            updated_at: '2026-04-14T00:00:00.000Z'
                        })
                    }
                ]
            };
        });

        sinon.stub(urlService, 'getUrlByResourceId').callsFake((id) => {
            const urls = {
                'page-a': 'https://example.com/about/',
                'post-a': 'https://example.com/post/'
            };

            return urls[id];
        });

        const llmsFullTxt = await service.getLlmsFullTxt();

        assert.match(llmsFullTxt, /## Pages/);
        assert.doesNotMatch(llmsFullTxt, /## Posts/);
        assert.match(llmsFullTxt, /Truncated after 5 MiB/);
    });

    it('invalidates cached output when the site URL setting is edited', async function () {
        sinon.stub(models.Post, 'findPage').resolves({data: []});
        sinon.stub(urlService, 'getUrlByResourceId').returns(null);

        await service.getLlmsTxt();
        assert.equal(service.cache.has('llms.txt'), true);

        eventBus.emit('settings.edited', {
            get(key) {
                if (key === 'key') {
                    return 'url';
                }

                return null;
            }
        });

        assert.equal(service.cache.size, 0);
    });
});
