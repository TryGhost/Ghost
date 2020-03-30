const should = require('should');
const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const supertest = require('supertest');
const testUtils = require('../../utils');
const config = require('../../../core/server/config');
const localUtils = require('./utils');

const ghost = testUtils.startGhost;

describe('Themes API', function () {
    let ghostServer;
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

    before(function () {
        return ghost()
            .then((_ghostServer) => {
                ghostServer = _ghostServer;
            });
    });

    before(function () {
        ownerRequest = supertest.agent(config.get('url'));
        return localUtils.doAuth(ownerRequest);
    });

    it('Can request all available themes', function () {
        return ownerRequest
            .get(localUtils.API.getApiQuery('themes/'))
            .set('Origin', config.get('url'))
            .expect(200)
            .then((res) => {
                const jsonResponse = res.body;
                should.exist(jsonResponse.themes);
                localUtils.API.checkResponse(jsonResponse, 'themes');
                jsonResponse.themes.length.should.eql(5);

                localUtils.API.checkResponse(jsonResponse.themes[0], 'theme');
                jsonResponse.themes[0].name.should.eql('broken-theme');
                jsonResponse.themes[0].package.should.be.an.Object().with.properties('name', 'version');
                jsonResponse.themes[0].active.should.be.false();

                localUtils.API.checkResponse(jsonResponse.themes[1], 'theme', 'templates');
                jsonResponse.themes[1].name.should.eql('casper');
                jsonResponse.themes[1].package.should.be.an.Object().with.properties('name', 'version');
                jsonResponse.themes[1].active.should.be.true();

                localUtils.API.checkResponse(jsonResponse.themes[2], 'theme');
                jsonResponse.themes[2].name.should.eql('casper-1.4');
                jsonResponse.themes[2].package.should.be.an.Object().with.properties('name', 'version');
                jsonResponse.themes[2].active.should.be.false();

                localUtils.API.checkResponse(jsonResponse.themes[3], 'theme');
                jsonResponse.themes[3].name.should.eql('test-theme');
                jsonResponse.themes[3].package.should.be.an.Object().with.properties('name', 'version');
                jsonResponse.themes[3].active.should.be.false();

                localUtils.API.checkResponse(jsonResponse.themes[4], 'theme');
                jsonResponse.themes[4].name.should.eql('test-theme-channels');
                jsonResponse.themes[4].package.should.be.false();
                jsonResponse.themes[4].active.should.be.false();
            });
    });

    it('Can download a theme', function () {
        return ownerRequest
            .get(localUtils.API.getApiQuery('themes/casper/download/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /application\/zip/)
            .expect('Content-Disposition', 'attachment; filename=casper.zip')
            .expect(200);
    });

    it('Can upload a valid theme', function () {
        return uploadTheme({themePath: path.join(__dirname, '..', '..', 'utils', 'fixtures', 'themes', 'valid.zip')})
            .then((res) => {
                const jsonResponse = res.body;

                should.not.exist(res.headers['x-cache-invalidate']);

                should.exist(jsonResponse.themes);
                localUtils.API.checkResponse(jsonResponse, 'themes');
                jsonResponse.themes.length.should.eql(1);
                localUtils.API.checkResponse(jsonResponse.themes[0], 'theme');
                jsonResponse.themes[0].name.should.eql('valid');
                jsonResponse.themes[0].active.should.be.false();

                // upload same theme again to force override
                return uploadTheme({themePath: path.join(__dirname, '..', '..', 'utils', 'fixtures', 'themes', 'valid.zip')});
            })
            .then((res) => {
                const jsonResponse = res.body;

                should.not.exist(res.headers['x-cache-invalidate']);
                should.exist(jsonResponse.themes);
                localUtils.API.checkResponse(jsonResponse, 'themes');
                jsonResponse.themes.length.should.eql(1);
                localUtils.API.checkResponse(jsonResponse.themes[0], 'theme');
                jsonResponse.themes[0].name.should.eql('valid');
                jsonResponse.themes[0].active.should.be.false();

                // ensure tmp theme folder contains two themes now
                const tmpFolderContents = fs.readdirSync(config.getContentPath('themes'));
                tmpFolderContents.forEach((theme, index) => {
                    if (theme.match(/^\./)) {
                        tmpFolderContents.splice(index, 1);
                    }
                });
                tmpFolderContents.should.be.an.Array().with.lengthOf(10);

                tmpFolderContents.should.eql([
                    'broken-theme',
                    'casper',
                    'casper-1.4',
                    'casper.zip',
                    'invalid.zip',
                    'test-theme',
                    'test-theme-channels',
                    'valid',
                    'valid.zip',
                    'warnings.zip'
                ]);

                // Check the Themes API returns the correct result
                return ownerRequest
                    .get(localUtils.API.getApiQuery('themes/'))
                    .set('Origin', config.get('url'))
                    .expect(200);
            })
            .then((res) => {
                const jsonResponse = res.body;

                should.exist(jsonResponse.themes);
                localUtils.API.checkResponse(jsonResponse, 'themes');
                jsonResponse.themes.length.should.eql(6);

                // Casper should be present and still active
                const casperTheme = _.find(jsonResponse.themes, {name: 'casper'});
                should.exist(casperTheme);
                localUtils.API.checkResponse(casperTheme, 'theme', 'templates');
                casperTheme.active.should.be.true();

                // The added theme should be here
                const addedTheme = _.find(jsonResponse.themes, {name: 'valid'});
                should.exist(addedTheme);
                localUtils.API.checkResponse(addedTheme, 'theme');
                addedTheme.active.should.be.false();
            });
    });

    it('Can delete a theme', function () {
        return ownerRequest
            .del(localUtils.API.getApiQuery('themes/valid'))
            .set('Origin', config.get('url'))
            .expect(204)
            .then((res) => {
                const jsonResponse = res.body;
                // Delete requests have empty bodies
                jsonResponse.should.eql({});

                // ensure tmp theme folder contains one theme again now
                const tmpFolderContents = fs.readdirSync(config.getContentPath('themes'));
                tmpFolderContents.forEach((theme, index) => {
                    if (theme.match(/^\./)) {
                        tmpFolderContents.splice(index, 1);
                    }
                });
                tmpFolderContents.should.be.an.Array().with.lengthOf(9);

                tmpFolderContents.should.eql([
                    'broken-theme',
                    'casper',
                    'casper-1.4',
                    'casper.zip',
                    'invalid.zip',
                    'test-theme',
                    'test-theme-channels',
                    'valid.zip',
                    'warnings.zip'
                ]);

                // Check the themes API returns the correct result after deletion
                return ownerRequest
                    .get(localUtils.API.getApiQuery('themes/'))
                    .set('Origin', config.get('url'))
                    .expect(200);
            })
            .then((res) => {
                const jsonResponse = res.body;

                should.exist(jsonResponse.themes);
                localUtils.API.checkResponse(jsonResponse, 'themes');
                jsonResponse.themes.length.should.eql(5);

                // Casper should be present and still active
                const casperTheme = _.find(jsonResponse.themes, {name: 'casper'});
                should.exist(casperTheme);
                localUtils.API.checkResponse(casperTheme, 'theme', 'templates');
                casperTheme.active.should.be.true();

                // The deleted theme should not be here
                const deletedTheme = _.find(jsonResponse.themes, {name: 'valid'});
                should.not.exist(deletedTheme);
            });
    });

    it('Can upload a theme, which has warnings', function () {
        return uploadTheme({themePath: path.join(__dirname, '/../../utils/fixtures/themes/warnings.zip')})
            .then((res) => {
                const jsonResponse = res.body;

                should.exist(jsonResponse.themes);
                localUtils.API.checkResponse(jsonResponse, 'themes');
                jsonResponse.themes.length.should.eql(1);
                localUtils.API.checkResponse(jsonResponse.themes[0], 'theme', ['warnings']);
                jsonResponse.themes[0].name.should.eql('warnings');
                jsonResponse.themes[0].active.should.be.false();
                jsonResponse.themes[0].warnings.should.be.an.Array();

                // Delete the theme to clean up after the test
                return ownerRequest
                    .del(localUtils.API.getApiQuery('themes/warnings'))
                    .set('Origin', config.get('url'))
                    .expect(204);
            });
    });

    it('Can activate a theme', function () {
        return ownerRequest
            .get(localUtils.API.getApiQuery('themes/'))
            .set('Origin', config.get('url'))
            .expect(200)
            .then((res) => {
                const jsonResponse = res.body;

                should.exist(jsonResponse.themes);
                localUtils.API.checkResponse(jsonResponse, 'themes');
                jsonResponse.themes.length.should.eql(5);

                const casperTheme = _.find(jsonResponse.themes, {name: 'casper'});
                should.exist(casperTheme);
                localUtils.API.checkResponse(casperTheme, 'theme', 'templates');
                casperTheme.active.should.be.true();

                const testTheme = _.find(jsonResponse.themes, {name: 'test-theme'});
                should.exist(testTheme);
                localUtils.API.checkResponse(testTheme, 'theme');
                testTheme.active.should.be.false();

                // Finally activate the new theme
                return ownerRequest
                    .put(localUtils.API.getApiQuery('themes/test-theme/activate'))
                    .set('Origin', config.get('url'))
                    .expect(200);
            })
            .then((res) => {
                const jsonResponse = res.body;

                should.exist(res.headers['x-cache-invalidate']);
                should.exist(jsonResponse.themes);
                localUtils.API.checkResponse(jsonResponse, 'themes');
                jsonResponse.themes.length.should.eql(1);

                const casperTheme = _.find(jsonResponse.themes, {name: 'casper'});
                should.not.exist(casperTheme);

                const testTheme = _.find(jsonResponse.themes, {name: 'test-theme'});
                should.exist(testTheme);
                localUtils.API.checkResponse(testTheme, 'theme', ['warnings', 'templates']);
                testTheme.active.should.be.true();
                testTheme.warnings.should.be.an.Array();
            });
    });
});
