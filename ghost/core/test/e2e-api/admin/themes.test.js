const should = require('should');
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

    it('Can request all available themes', async function () {
        const res = await ownerRequest
            .get(localUtils.API.getApiQuery('themes/'))
            .set('Origin', config.get('url'))
            .expect(200);

        const jsonResponse = res.body;
        should.exist(jsonResponse.themes);
        localUtils.API.checkResponse(jsonResponse, 'themes');
        jsonResponse.themes.length.should.eql(6);

        localUtils.API.checkResponse(jsonResponse.themes[0], 'theme');
        jsonResponse.themes[0].name.should.eql('broken-theme');
        jsonResponse.themes[0].package.should.be.an.Object().with.properties('name', 'version');
        jsonResponse.themes[0].active.should.be.false();

        localUtils.API.checkResponse(jsonResponse.themes[1], 'theme', 'templates');
        jsonResponse.themes[1].name.should.eql('casper');
        jsonResponse.themes[1].package.should.be.an.Object().with.properties('name', 'version');
        jsonResponse.themes[1].active.should.be.true();

        localUtils.API.checkResponse(jsonResponse.themes[2], 'theme');
        jsonResponse.themes[2].name.should.eql('locale-theme');
        jsonResponse.themes[2].package.should.be.an.Object().with.properties('name', 'version');
        jsonResponse.themes[2].active.should.be.false();

        localUtils.API.checkResponse(jsonResponse.themes[3], 'theme');
        jsonResponse.themes[3].name.should.eql('members-test-theme');
        jsonResponse.themes[3].package.should.be.an.Object().with.properties('name', 'version');
        jsonResponse.themes[3].active.should.be.false();

        localUtils.API.checkResponse(jsonResponse.themes[4], 'theme');
        jsonResponse.themes[4].name.should.eql('test-theme');
        jsonResponse.themes[4].package.should.be.an.Object().with.properties('name', 'version');
        jsonResponse.themes[4].active.should.be.false();

        localUtils.API.checkResponse(jsonResponse.themes[5], 'theme');
        jsonResponse.themes[5].name.should.eql('test-theme-channels');
        jsonResponse.themes[5].package.should.be.false();
        jsonResponse.themes[5].active.should.be.false();
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

        should.not.exist(res.headers['x-cache-invalidate']);

        should.exist(jsonResponse.themes);
        localUtils.API.checkResponse(jsonResponse, 'themes');
        jsonResponse.themes.length.should.eql(1);
        localUtils.API.checkResponse(jsonResponse.themes[0], 'theme');
        jsonResponse.themes[0].name.should.eql('valid');
        jsonResponse.themes[0].active.should.be.false();

        // Note: at this point, the tmpFolder can legitimately still contain a valid_34324324 backup
        // As it is deleted asynchronously
        const tmpFolderContents = fs.readdirSync(config.getContentPath('themes'));
        tmpFolderContents.forEach((theme, index) => {
            if (theme.match(/^\./)) {
                tmpFolderContents.splice(index, 1);
            }
        });

        tmpFolderContents.should.containEql('valid');
        tmpFolderContents.should.containEql('valid.zip');

        // Check the Themes API returns the correct result
        const res3 = await ownerRequest
            .get(localUtils.API.getApiQuery('themes/'))
            .set('Origin', config.get('url'))
            .expect(200);

        const jsonResponse3 = res3.body;

        should.exist(jsonResponse3.themes);
        localUtils.API.checkResponse(jsonResponse3, 'themes');
        jsonResponse3.themes.length.should.eql(7);

        // Casper should be present and still active
        const casperTheme = _.find(jsonResponse3.themes, {name: 'casper'});
        should.exist(casperTheme);
        localUtils.API.checkResponse(casperTheme, 'theme', 'templates');
        casperTheme.active.should.be.true();

        // The added theme should be here
        const addedTheme = _.find(jsonResponse3.themes, {name: 'valid'});
        should.exist(addedTheme);
        localUtils.API.checkResponse(addedTheme, 'theme');
        addedTheme.active.should.be.false();

        // Note: at this point, the API should not return a valid_34324324 backup folder as a theme
        _.map(jsonResponse3.themes, 'name').should.eql([
            'broken-theme',
            'casper',
            'locale-theme',
            'members-test-theme',
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
            .expect((_res) => {
                _res.body.should.be.empty();
            });

        // ensure tmp theme folder contains one theme again now
        const tmpFolderContents = fs.readdirSync(config.getContentPath('themes'));
        for (let i = 0; i < tmpFolderContents.length; i++) {
            while (tmpFolderContents[i].match(/^\./) || tmpFolderContents[i] === 'README.md') {
                tmpFolderContents.splice(i, 1);
            }
        }
        tmpFolderContents.should.be.an.Array().with.lengthOf(10);

        tmpFolderContents.should.eql([
            'broken-theme',
            'casper',
            'casper.zip',
            'invalid.zip',
            'locale-theme',
            'members-test-theme',
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

        should.exist(jsonResponse2.themes);
        localUtils.API.checkResponse(jsonResponse2, 'themes');
        jsonResponse2.themes.length.should.eql(6);

        // Casper should be present and still active
        const casperTheme = _.find(jsonResponse2.themes, {name: 'casper'});
        should.exist(casperTheme);
        localUtils.API.checkResponse(casperTheme, 'theme', 'templates');
        casperTheme.active.should.be.true();

        // The deleted theme should not be here
        const deletedTheme = _.find(jsonResponse2.themes, {name: 'valid'});
        should.not.exist(deletedTheme);
    });

    it('Can upload a theme, which has warnings', async function () {
        const res = await uploadTheme({themePath: path.join(__dirname, '/../../utils/fixtures/themes/warnings.zip')});
        const jsonResponse = res.body;

        should.exist(jsonResponse.themes);
        localUtils.API.checkResponse(jsonResponse, 'themes');
        jsonResponse.themes.length.should.eql(1);
        localUtils.API.checkResponse(jsonResponse.themes[0], 'theme', ['warnings']);
        jsonResponse.themes[0].name.should.eql('warnings');
        jsonResponse.themes[0].active.should.be.false();
        jsonResponse.themes[0].warnings.should.be.an.Array();

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

        should.exist(jsonResponse.themes);
        localUtils.API.checkResponse(jsonResponse, 'themes');
        jsonResponse.themes.length.should.eql(6);

        const casperTheme = _.find(jsonResponse.themes, {name: 'casper'});
        should.exist(casperTheme);
        localUtils.API.checkResponse(casperTheme, 'theme', 'templates');
        casperTheme.active.should.be.true();

        const testTheme = _.find(jsonResponse.themes, {name: 'test-theme'});
        should.exist(testTheme);
        localUtils.API.checkResponse(testTheme, 'theme');
        testTheme.active.should.be.false();

        // Finally activate the new theme
        const res2 = await ownerRequest
            .put(localUtils.API.getApiQuery('themes/test-theme/activate'))
            .set('Origin', config.get('url'))
            .expect(200);

        const jsonResponse2 = res2.body;

        should.exist(res2.headers['x-cache-invalidate']);
        should.exist(jsonResponse2.themes);
        localUtils.API.checkResponse(jsonResponse2, 'themes');
        jsonResponse2.themes.length.should.eql(1);

        const casperTheme2 = _.find(jsonResponse2.themes, {name: 'casper'});
        should.not.exist(casperTheme2);

        const testTheme2 = _.find(jsonResponse2.themes, {name: 'test-theme'});
        should.exist(testTheme2);
        localUtils.API.checkResponse(testTheme2, 'theme', ['warnings', 'templates']);
        testTheme2.active.should.be.true();
        testTheme2.warnings.should.be.an.Array();

        // Result should be the same
        const activeThemeResult = await ownerRequest
            .get(localUtils.API.getApiQuery('themes/active/'))
            .set('Origin', config.get('url'))
            .expect(200);

        res2.body.should.eql(activeThemeResult.body);
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

        githubZipball.isDone().should.be.true();
        githubDownload.isDone().should.be.true();

        const jsonResponse = res.body;

        should.exist(jsonResponse.themes);
        localUtils.API.checkResponse(jsonResponse, 'themes');
        jsonResponse.themes.length.should.eql(1);
        localUtils.API.checkResponse(jsonResponse.themes[0], 'theme', ['warnings']);
        jsonResponse.themes[0].name.should.eql('test');
        jsonResponse.themes[0].active.should.be.false();
        jsonResponse.themes[0].warnings.should.be.an.Array();

        // Delete the theme to clean up after the test
        await ownerRequest
            .del(localUtils.API.getApiQuery('themes/test'))
            .set('Origin', config.get('url'))
            .expect(204);
    });

    it('Can re-upload the active theme to override', async function () {
        // The tricky thing about this test is the default active theme is Casper and you're not allowed to override it.
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

        should.exist(res.headers['x-cache-invalidate']);

        should.exist(jsonResponse.themes);
        localUtils.API.checkResponse(jsonResponse, 'themes');
        jsonResponse.themes.length.should.eql(1);
        localUtils.API.checkResponse(jsonResponse.themes[0], 'theme', 'templates');
        jsonResponse.themes[0].name.should.eql('valid');
        jsonResponse.themes[0].active.should.be.true();
    });
});
