import assert from 'node:assert/strict';
import {describe, it} from 'vitest';
import {createSettingsCache, loadSettings} from '../../src/seam/settings.ts';
import {createUrlService} from '../../src/seam/url-service.ts';
import {createUrlUtils} from '../../src/seam/url-utils.ts';

describe('seam: settings snapshot', function () {
    it('provides synchronous get/getPublic', function () {
        const {settings} = createSettingsCache({title: 'My Site', locale: 'en'});
        assert.equal(settings.get('title'), 'My Site');
        assert.equal(settings.getPublic().locale, 'en');
    });

    it('returns undefined for keys the public payload lacks (documented deltas)', function () {
        const {settings} = createSettingsCache({title: 'My Site'});
        for (const key of ['announcement_content', 'heading_font', 'body_font', 'members_track_sources', 'is_private', 'llms_enabled', 'active_theme']) {
            assert.equal(settings.get(key), undefined, key);
        }
    });

    it('undoes the content API icon resize rewrite', function () {
        const {settings} = createSettingsCache({icon: 'http://localhost:2368/content/images/size/w256h256/2024/01/icon.png'});
        assert.equal(settings.get('icon'), 'http://localhost:2368/content/images/2024/01/icon.png');
    });

    it('derives labs from the public labs setting', function () {
        const {labs} = createSettingsCache({labs: {themeTranslation: true}});
        assert.equal(labs.isSet('themeTranslation'), true);
        assert.equal(labs.isSet('other'), false);
        assert.deepEqual(labs.getAll(), {themeTranslation: true});
    });

    it('loadSettings fetches /content/settings/', async function () {
        const calls: string[] = [];
        const fetchImpl = (async (url: RequestInfo | URL) => {
            calls.push(String(url));
            return new Response(JSON.stringify({settings: {title: 'Fetched'}}), {status: 200});
        }) as typeof globalThis.fetch;

        const snapshot = await loadSettings({siteUrl: 'http://localhost:2368', key: 'k3y', fetch: fetchImpl});
        const url = new URL(calls[0] as string);
        assert.equal(url.pathname, '/ghost/api/content/settings/');
        assert.equal(url.searchParams.get('key'), 'k3y');
        assert.equal(snapshot.settings.get('title'), 'Fetched');
    });
});

describe('seam: url service', function () {
    const urlUtils = createUrlUtils({getSiteUrl: () => 'http://localhost:2368/'});
    const urlService = createUrlService(urlUtils);

    it('prefers the serializer-attached url', function () {
        const resource = {slug: 'welcome', url: 'http://localhost:2368/welcome/'};
        assert.equal(urlService.getUrlForResource(resource, {withSubdirectory: true}), '/welcome/');
        assert.equal(urlService.getUrlForResource(resource, {absolute: true}), 'http://localhost:2368/welcome/');
    });

    it('falls back to /404/ without an attached url', function () {
        assert.equal(urlService.getUrlForResource({slug: 'welcome'}), '/404/');
    });

    it('ownsResource is true in slice 1', function () {
        assert.equal(urlService.ownsResource('index', {}), true);
    });
});
