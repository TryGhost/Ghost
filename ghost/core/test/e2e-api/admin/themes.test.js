const assert = require('node:assert/strict');
const {assertExists} = require('../../utils/assertions');
const sinon = require('sinon');
const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const supertest = require('supertest');
const nock = require('nock');
const config = require('../../../core/shared/config');
const localUtils = require('./utils');
const settingsCache = require('../../../core/shared/settings-cache');
const origCache = _.cloneDeep(settingsCache);
const {mockManager} = require('../../utils/e2e-framework');

describe('Themes API', function () {
    let ownerRequest;

    const uploadTheme = (options) => {
        const themePath = options.themePath;
        const fieldName = 'file';
        const request = options.request || ownerRequest;

        return request
            .post(localUtils.API.getApiQuery('themes/upload'))
            .set('Origin', config.get('url'))
            .attach(fieldName, themePath);
    };

    before(async function () {
        await localUtils.startGhost({
            copyThemes: true
        });
        ownerRequest = supertest.agent(config.get('url'));
        await localUtils.doAuth(ownerRequest);
    });

    after(function () {
        sinon.restore();
    });

    afterEach(function () {
        nock.cleanAll();
    });

    it('Can request all available themes', async function () {
        const res = await ownerRequest
            .get(localUtils.API.getApiQuery('themes/'))
            .set('Origin', config.get('url'))
            .expect(200);

        const jsonResponse = res.body;
        assertExists(jsonResponse.themes);
        localUtils.API.checkResponse(jsonResponse, 'themes');
        assert.equal(jsonResponse.themes.length, 7);

        localUtils.API.checkResponse(jsonResponse.themes[0], 'theme');
        assert.equal(jsonResponse.themes[0].name, 'broken-theme');
        assert(jsonResponse.themes[0].package && typeof jsonResponse.themes[0].package === 'object');
        assert('name' in jsonResponse.themes[0].package);
        assert('version' in jsonResponse.themes[0].package);
        assert.equal(jsonResponse.themes[0].active, false);

        localUtils.API.checkResponse(jsonResponse.themes[1], 'theme');
        assert.equal(jsonResponse.themes[1].name, 'casper');
        assert(jsonResponse.themes[1].package && typeof jsonResponse.themes[1].package === 'object');
        assert('name' in jsonResponse.themes[1].package);
        assert('version' in jsonResponse.themes[1].package);
        assert.equal(jsonResponse.themes[1].active, false);

        localUtils.API.checkResponse(jsonResponse.themes[2], 'theme');
        assert.equal(jsonResponse.themes[2].name, 'locale-theme');
        assert(jsonResponse.themes[2].package && typeof jsonResponse.themes[2].package === 'object');
        assert('name' in jsonResponse.themes[2].package);
        assert('version' in jsonResponse.themes[2].package);
        assert.equal(jsonResponse.themes[2].active, false);

        localUtils.API.checkResponse(jsonResponse.themes[3], 'theme');
        assert.equal(jsonResponse.themes[3].name, 'members-test-theme');
        assert(jsonResponse.themes[3].package && typeof jsonResponse.themes[3].package === 'object');
        assert('name' in jsonResponse.themes[3].package);
        assert('version' in jsonResponse.themes[3].package);
        assert.equal(jsonResponse.themes[3].active, false);

        localUtils.API.checkResponse(jsonResponse.themes[4], 'theme', 'templates');
        assert.equal(jsonResponse.themes[4].name, 'source');
        assert(jsonResponse.themes[4].package && typeof jsonResponse.themes[4].package === 'object');
        assert('name' in jsonResponse.themes[4].package);
        assert('version' in jsonResponse.themes[4].package);
        assert.equal(jsonResponse.themes[4].active, true);

        localUtils.API.checkResponse(jsonResponse.themes[5], 'theme');
        assert.equal(jsonResponse.themes[5].name, 'test-theme');
        assert(jsonResponse.themes[5].package && typeof jsonResponse.themes[5].package === 'object');
        assert('name' in jsonResponse.themes[5].package);
        assert('version' in jsonResponse.themes[5].package);
        assert.equal(jsonResponse.themes[5].active, false);

        localUtils.API.checkResponse(jsonResponse.themes[6], 'theme');
        assert.equal(jsonResponse.themes[6].name, 'test-theme-channels');
        assert.equal(jsonResponse.themes[6].package, false);
        assert.equal(jsonResponse.themes[6].active, false);
    });

    it('Can download a theme', async function () {
        await ownerRequest
            .get(localUtils.API.getApiQuery('themes/casper/download/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /application\/zip/)
            .expect('Content-Disposition', 'attachment; filename=casper.zip')
            .expect(200);
    });

    it('Can fetch active theme', async function () {
        await ownerRequest
            .get(localUtils.API.getApiQuery('themes/active/'))
            .set('Origin', config.get('url'))
            .expect(200);
    });

    it('Can upload a valid theme', async function () {
        const res = await uploadTheme({themePath: path.join(__dirname, '..', '..', 'utils', 'fixtures', 'themes', 'valid.zip')});
        const jsonResponse = res.body;

        assert.equal(res.headers['x-cache-invalidate'], undefined);

        assertExists(jsonResponse.themes);
        localUtils.API.checkResponse(jsonResponse, 'themes');
        assert.equal(jsonResponse.themes.length, 1);
        localUtils.API.checkResponse(jsonResponse.themes[0], 'theme');
        assert.equal(jsonResponse.themes[0].name, 'valid');
        assert.equal(jsonResponse.themes[0].active, false);

        // Note: at this point, the tmpFolder can legitimately still contain a valid_34324324 backup
        // As it is deleted asynchronously
        const tmpFolderContents = fs.readdirSync(config.getContentPath('themes'));
        tmpFolderContents.forEach((theme, index) => {
            if (theme.match(/^\./)) {
                tmpFolderContents.splice(index, 1);
            }
        });

        assert(tmpFolderContents.includes('valid'));
        assert(tmpFolderContents.includes('valid.zip'));

        // Check the Themes API returns the correct result
        const res3 = await ownerRequest
            .get(localUtils.API.getApiQuery('themes/'))
            .set('Origin', config.get('url'))
            .expect(200);

        const jsonResponse3 = res3.body;

        assertExists(jsonResponse3.themes);
        localUtils.API.checkResponse(jsonResponse3, 'themes');
        assert.equal(jsonResponse3.themes.length, 8);

        // Source should be present and still active
        const sourceTheme = _.find(jsonResponse3.themes, {name: 'source'});
        assertExists(sourceTheme);
        localUtils.API.checkResponse(sourceTheme, 'theme', 'templates');
        assert.equal(sourceTheme.active, true);

        // The added theme should be here
        const addedTheme = _.find(jsonResponse3.themes, {name: 'valid'});
        assertExists(addedTheme);
        localUtils.API.checkResponse(addedTheme, 'theme');
        assert.equal(addedTheme.active, false);

        // Note: at this point, the API should not return a valid_34324324 backup folder as a theme
        assert.deepEqual(_.map(jsonResponse3.themes, 'name'), [
            'broken-theme',
            'casper',
            'locale-theme',
            'members-test-theme',
            'source',
            'test-theme',
            'test-theme-channels',
            'valid'
        ]);
    });

    it('Can delete a theme', async function () {
        await ownerRequest
            .del(localUtils.API.getApiQuery('themes/valid'))
            .set('Origin', config.get('url'))
            .expect(204)
            .expect((res) => {
                assert.deepEqual(res.body, {});
            });

        // ensure tmp theme folder contains one theme again now
        const tmpFolderContents = fs.readdirSync(config.getContentPath('themes'));
        for (let i = 0; i < tmpFolderContents.length; i++) {
            while (tmpFolderContents[i].match(/^\./) || tmpFolderContents[i] === 'README.md') {
                tmpFolderContents.splice(i, 1);
            }
        }
        assert.deepEqual(tmpFolderContents, [
            'broken-theme',
            'casper',
            'casper.zip',
            'invalid.zip',
            'locale-theme',
            'members-test-theme',
            'source',
            'source.zip',
            'test-theme',
            'test-theme-channels',
            'valid.zip',
            'warnings.zip'
        ]);

        // Check the themes API returns the correct result after deletion
        const res2 = await ownerRequest
            .get(localUtils.API.getApiQuery('themes/'))
            .set('Origin', config.get('url'))
            .expect(200);

        const jsonResponse2 = res2.body;

        assertExists(jsonResponse2.themes);
        localUtils.API.checkResponse(jsonResponse2, 'themes');
        assert.equal(jsonResponse2.themes.length, 7);

        // Source should be present and still active
        const sourceTheme = _.find(jsonResponse2.themes, {name: 'source'});
        assertExists(sourceTheme);
        localUtils.API.checkResponse(sourceTheme, 'theme', 'templates');
        assert.equal(sourceTheme.active, true);

        // The deleted theme should not be here
        const deletedTheme = _.find(jsonResponse2.themes, {name: 'valid'});
        assert.equal(deletedTheme, undefined);
    });

    it('Can upload a theme, which has warnings', async function () {
        const res = await uploadTheme({themePath: path.join(__dirname, '/../../utils/fixtures/themes/warnings.zip')});
        const jsonResponse = res.body;

        assertExists(jsonResponse.themes);
        localUtils.API.checkResponse(jsonResponse, 'themes');
        assert.equal(jsonResponse.themes.length, 1);
        localUtils.API.checkResponse(jsonResponse.themes[0], 'theme', ['warnings']);
        assert.equal(jsonResponse.themes[0].name, 'warnings');
        assert.equal(jsonResponse.themes[0].active, false);
        assert(Array.isArray(jsonResponse.themes[0].warnings));

        // Delete the theme to clean up after the test
        await ownerRequest
            .del(localUtils.API.getApiQuery('themes/warnings'))
            .set('Origin', config.get('url'))
            .expect(204);
    });

    it('Can activate a theme', async function () {
        const res = await ownerRequest
            .get(localUtils.API.getApiQuery('themes/'))
            .set('Origin', config.get('url'))
            .expect(200);

        const jsonResponse = res.body;

        assertExists(jsonResponse.themes);
        localUtils.API.checkResponse(jsonResponse, 'themes');
        assert.equal(jsonResponse.themes.length, 7);

        const sourceTheme = _.find(jsonResponse.themes, {name: 'source'});
        assertExists(sourceTheme);
        localUtils.API.checkResponse(sourceTheme, 'theme', 'templates');
        assert.equal(sourceTheme.active, true);

        const testTheme = _.find(jsonResponse.themes, {name: 'test-theme'});
        assertExists(testTheme);
        localUtils.API.checkResponse(testTheme, 'theme');
        assert.equal(testTheme.active, false);

        // Finally activate the new theme
        const res2 = await ownerRequest
            .put(localUtils.API.getApiQuery('themes/test-theme/activate'))
            .set('Origin', config.get('url'))
            .expect(200);

        const jsonResponse2 = res2.body;

        assertExists(res2.headers['x-cache-invalidate']);
        assertExists(jsonResponse2.themes);
        localUtils.API.checkResponse(jsonResponse2, 'themes');
        assert.equal(jsonResponse2.themes.length, 1);

        const sourceTheme2 = _.find(jsonResponse2.themes, {name: 'source'});
        assert.equal(sourceTheme2, undefined);

        const testTheme2 = _.find(jsonResponse2.themes, {name: 'test-theme'});
        assertExists(testTheme2);
        localUtils.API.checkResponse(testTheme2, 'theme', ['warnings', 'templates']);
        assert.equal(testTheme2.active, true);
        assert(Array.isArray(testTheme2.warnings));

        // Result should be the same
        const activeThemeResult = await ownerRequest
            .get(localUtils.API.getApiQuery('themes/active/'))
            .set('Origin', config.get('url'))
            .expect(200);

        assert.deepEqual(res2.body, activeThemeResult.body);
    });

    it('Can download and install a theme from GitHub', async function () {
        const githubZipball = nock('https://api.github.com')
            .get('/repos/tryghost/test/zipball')
            .reply(302, null, {Location: 'https://codeload.github.com/TryGhost/Test/legacy.zip/main'});

        const githubDownload = nock('https://codeload.github.com')
            .get('/TryGhost/Test/legacy.zip/main')
            .replyWithFile(200, path.join(__dirname, '/../../utils/fixtures/themes/warnings.zip'), {
                'Content-Type': 'application/zip',
                'Content-Disposition': 'attachment; filename=TryGhost-Test-3.1.2-38-gfc8cf0b.zip'
            });

        const res = await ownerRequest
            .post(localUtils.API.getApiQuery('themes/install/?source=github&ref=TryGhost/Test'))
            .set('Origin', config.get('url'));

        assert.equal(githubZipball.isDone(), true);
        assert.equal(githubDownload.isDone(), true);

        const jsonResponse = res.body;

        assertExists(jsonResponse.themes);
        localUtils.API.checkResponse(jsonResponse, 'themes');
        assert.equal(jsonResponse.themes.length, 1);
        localUtils.API.checkResponse(jsonResponse.themes[0], 'theme', ['warnings']);
        assert.equal(jsonResponse.themes[0].name, 'test');
        assert.equal(jsonResponse.themes[0].active, false);
        assert(Array.isArray(jsonResponse.themes[0].warnings));

        // Delete the theme to clean up after the test
        await ownerRequest
            .del(localUtils.API.getApiQuery('themes/test'))
            .set('Origin', config.get('url'))
            .expect(204);
    });

    it('Can download and install a TryGhost theme from GitHub when customThemes limit is active', async function () {
        // Mock the limit service to restrict custom themes but specific official Ghost themes
        mockManager.mockLimitService('customThemes', {
            isLimited: true,
            errorIfWouldGoOverLimit: false,
            allowlist: ['source', 'casper', 'starter', 'edition']
        });

        const githubZipball = nock('https://api.github.com')
            .get('/repos/tryghost/starter/zipball')
            .reply(302, null, {Location: 'https://codeload.github.com/TryGhost/Starter/legacy.zip/main'});

        const githubDownload = nock('https://codeload.github.com')
            .get('/TryGhost/Starter/legacy.zip/main')
            .replyWithFile(200, path.join(__dirname, '/../../utils/fixtures/themes/warnings.zip'), {
                'Content-Type': 'application/zip',
                'Content-Disposition': 'attachment; filename=TryGhost-Starter-1.0.0.zip'
            });

        const res = await ownerRequest
            .post(localUtils.API.getApiQuery('themes/install/?source=github&ref=TryGhost/Starter'))
            .set('Origin', config.get('url'));

        assert.equal(githubZipball.isDone(), true);
        assert.equal(githubDownload.isDone(), true);

        const jsonResponse = res.body;

        assertExists(jsonResponse.themes);
        localUtils.API.checkResponse(jsonResponse, 'themes');
        assert.equal(jsonResponse.themes.length, 1);
        localUtils.API.checkResponse(jsonResponse.themes[0], 'theme', ['warnings']);
        assert.equal(jsonResponse.themes[0].name, 'starter');
        assert.equal(jsonResponse.themes[0].active, false);
        assert(Array.isArray(jsonResponse.themes[0].warnings));

        // Delete the theme to clean up after the test
        await ownerRequest
            .del(localUtils.API.getApiQuery('themes/starter'))
            .set('Origin', config.get('url'))
            .expect(204);

        // Clean up only the limit service mocks
        mockManager.restoreLimitService();
    });

    it('Cannot download and install a theme from GitHub with customThemes limit and request theme name is not allowed', async function () {
        // Mock the limit service to restrict custom themes and throw error for non-allowed themes
        mockManager.mockLimitService('customThemes', {
            isLimited: true,
            errorIfWouldGoOverLimit: true,
            allowlist: ['source']
        });

        const githubZipball = nock('https://api.github.com')
            .get('/repos/tryghost/starter/zipball')
            .reply(302, null, {Location: 'https://codeload.github.com/TryGhost/Starter/legacy.zip/main'});

        const githubDownload = nock('https://codeload.github.com')
            .get('/TryGhost/Starter/legacy.zip/main')
            .replyWithFile(200, path.join(__dirname, '/../../utils/fixtures/themes/warnings.zip'), {
                'Content-Type': 'application/zip',
                'Content-Disposition': 'attachment; filename=TryGhost-Starter-1.0.0.zip'
            });

        const res = await ownerRequest
            .post(localUtils.API.getApiQuery('themes/install/?source=github&ref=TryGhost/Starter'))
            .set('Origin', config.get('url'))
            .expect(403);

        // The GitHub API calls should NOT be made (limit check happens before download)
        assert.equal(githubZipball.isDone(), false);
        assert.equal(githubDownload.isDone(), false);

        const jsonResponse = res.body;

        assertExists(jsonResponse.errors);
        assert.equal(jsonResponse.errors[0].type, 'HostLimitError');
        assert.match(jsonResponse.errors[0].message, /Upgrade to use customThemes feature\./);

        // Clean up only the limit service mocks
        mockManager.restoreLimitService();
    });

    it('Can re-upload the active theme to override', async function () {
        // The tricky thing about this test is the default active theme is Source and you're not allowed to override it.
        // So we upload a valid theme, activate it, and then upload again.
        sinon.stub(settingsCache, 'get').callsFake(function (key, options) {
            if (key === 'active_theme') {
                return 'valid';
            }

            return origCache.get(key, options);
        });

        // Upload the valid theme
        const res = await uploadTheme({themePath: path.join(__dirname, '..', '..', 'utils', 'fixtures', 'themes', 'valid.zip')});
        const jsonResponse = res.body;

        assertExists(res.headers['x-cache-invalidate']);

        assertExists(jsonResponse.themes);
        localUtils.API.checkResponse(jsonResponse, 'themes');
        assert.equal(jsonResponse.themes.length, 1);
        localUtils.API.checkResponse(jsonResponse.themes[0], 'theme', 'templates');
        assert.equal(jsonResponse.themes[0].name, 'valid');
        assert.equal(jsonResponse.themes[0].active, true);
    });
});
