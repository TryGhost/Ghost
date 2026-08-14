import assert from 'node:assert/strict';
import path from 'node:path';
import sinon from 'sinon';
import supertest from 'supertest';
import moment from 'moment';
import {afterAll, beforeAll} from 'vitest';

const fs = require('fs-extra');
const testUtils = require('../utils');
const configUtils = require('../utils/config-utils');
const settingsCache = require('../../core/shared/settings-cache');
const themeActivator = require('../../core/server/services/themes/activate');

const OVERRIDE_THEME = 'gift-toast-override-theme';

// A theme's `partials/` dir is only registered (and thus able to override the
// core `gift-toast` partial) when the theme references at least one partial:
// gscan only reports referenced partials, and `active.partialsPath` is null
// otherwise. So the theme references a `{{> marker}}` partial from its layout.
const THEME_FILES: Record<string, string> = {
    'package.json': JSON.stringify({
        name: OVERRIDE_THEME,
        description: 'Theme that overrides the default gift-toast partial',
        version: '1.0.0',
        license: 'MIT',
        config: {posts_per_page: 25}
    }),
    'index.hbs': '',
    'default.hbs': [
        '<!DOCTYPE html>',
        '<html lang="{{@site.locale}}">',
        '<head>{{ghost_head}}</head>',
        '<body class="{{body_class}}">',
        '    {{> marker}}',
        '    {{{body}}}',
        '    {{ghost_foot}}',
        '</body>',
        '</html>'
    ].join('\n'),
    'post.hbs': '{{!< default}}\n{{#post}}<div class="post-content">{{content}}</div>{{/post}}',
    'partials/marker.hbs': '<span id="theme-marker">override theme</span>',
    'partials/gift-toast.hbs': '<div id="custom-gift-toast">Custom theme gift toast</div>'
};

// Generates the override theme on disk and activates it at runtime — kept out of
// the shared test/utils/fixtures/themes dir so the admin themes-list fixtures
// (and the tests that enumerate them) are unaffected.
async function writeAndActivateOverrideTheme() {
    const themesPath = configUtils.config.getContentPath('themes');
    for (const [relPath, contents] of Object.entries(THEME_FILES)) {
        const filePath = path.join(themesPath, OVERRIDE_THEME, relPath);
        await fs.ensureDir(path.dirname(filePath));
        await fs.writeFile(filePath, contents);
    }
    await themeActivator.loadAndActivate(OVERRIDE_THEME);
}

describe('Front-end gift links — theme toast override', function () {
    let request: any;
    let token: string;
    const slug = 'gift-override-paid-post';

    beforeAll(async function () {
        const originalSettingsCacheGetFn = settingsCache.get;
        sinon.stub(settingsCache, 'get').callsFake(function (key: any, options: any) {
            if (key === 'labs') {
                return {members: true, giftLinks: true};
            }
            if (key === 'active_theme') {
                return OVERRIDE_THEME;
            }
            return originalSettingsCacheGetFn(key, options);
        });

        await testUtils.startGhost({copyThemes: true});
        await writeAndActivateOverrideTheme();

        const paidPost = testUtils.DataGenerator.forKnex.createPost({
            slug,
            visibility: 'paid',
            status: 'published',
            published_at: moment().toDate(),
            lexical: testUtils.DataGenerator.markdownToLexical('Before paywall\n\n<!--members-only-->\n\nAfter paywall')
        });
        await testUtils.fixtures.insertPosts([paidPost]);

        const giftLinksService = require('../../core/server/services/gift-links');
        const post = await giftLinksService.service.ensure({actor: null}, paidPost.id);
        token = post.giftLinks[0].token;

        request = supertest.agent(configUtils.config.get('url'));
    });

    afterAll(function () {
        sinon.restore();
    });

    it('renders the theme partials/gift-toast.hbs instead of the core default', async function () {
        const res = await request
            .get(`/${slug}/?gift=${token}`)
            .expect(200);

        assert.match(res.text, /id="custom-gift-toast"/, 'theme partial overrides the default toast');
        assert.doesNotMatch(res.text, /id="gh-gift-toast"/, 'core default toast is not rendered when overridden');
    });
});
