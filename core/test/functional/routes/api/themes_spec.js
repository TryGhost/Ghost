var testUtils = require('../../../utils'),
    should = require('should'),
    supertest = require('supertest'),
    fs = require('fs-extra'),
    join = require('path').join,
    tmp = require('tmp'),
    _ = require('lodash'),
    request;

describe('Themes API (Forked)', function () {
    var scope = {
        ownerAccessToken: '',
        editorAccessToken: '',
        uploadTheme: function uploadTheme(options) {
            var themePath = options.themePath,
                fieldName = options.fieldName || 'theme',
                accessToken = options.accessToken || scope.ownerAccessToken;

            return request.post(testUtils.API.getApiQuery('themes/upload'))
                .set('Authorization', 'Bearer ' + accessToken)
                .attach(fieldName, themePath);
        },
        editor: null
    }, forkedGhost, tmpContentPath;

    function setupThemesFolder() {
        tmpContentPath = tmp.dirSync({unsafeCleanup: true});

        fs.mkdirSync(join(tmpContentPath.name, 'themes'));
        fs.mkdirSync(join(tmpContentPath.name, 'themes', 'casper'));
        fs.writeFileSync(
            join(tmpContentPath.name, 'themes', 'casper', 'package.json'),
            JSON.stringify({name: 'casper', version: '0.1.2'})
        );
    }

    function teardownThemesFolder() {
        return tmpContentPath.removeCallback();
    }

    before(function (done) {
        // Setup a temporary themes directory
        setupThemesFolder();
        // Fork Ghost to read from the temp directory, not the developer's themes
        testUtils.fork.ghost({
            paths: {
                contentPath: tmpContentPath.name
            }
        }, 'themetests')
            .then(function (child) {
                forkedGhost = child;
                request = supertest('http://127.0.0.1:' + child.port);
            })
            .then(function () {
                return testUtils.doAuth(request);
            })
            .then(function (token) {
                scope.ownerAccessToken = token;

                return testUtils.createUser({
                    user: testUtils.DataGenerator.forKnex.createUser({email: 'test+1@ghost.org'}),
                    role: testUtils.DataGenerator.Content.roles[1]
                });
            })
            .then(function (user) {
                scope.editor = user;

                request.user = scope.editor;
                return testUtils.doAuth(request);
            })
            .then(function (token) {
                scope.editorAccessToken = token;
                done();
            })
            .catch(done);
    });

    after(function (done) {
        teardownThemesFolder();

        if (forkedGhost) {
            forkedGhost.kill(done);
        } else {
            done(new Error('No forked ghost process exists, test setup must have failed.'));
        }
    });

    describe('success cases', function () {
        it('get all themes', function (done) {
            request.get(testUtils.API.getApiQuery('themes/'))
                .set('Authorization', 'Bearer ' + scope.ownerAccessToken)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    var jsonResponse = res.body;
                    should.exist(jsonResponse.themes);
                    testUtils.API.checkResponse(jsonResponse, 'themes');
                    jsonResponse.themes.length.should.eql(1);

                    testUtils.API.checkResponse(jsonResponse.themes[0], 'theme');
                    jsonResponse.themes[0].name.should.eql('casper');
                    jsonResponse.themes[0].package.should.be.an.Object().with.properties('name', 'version');
                    jsonResponse.themes[0].active.should.be.true();

                    done();
                });
        });

        it('download theme', function (done) {
            request.get(testUtils.API.getApiQuery('themes/casper/download/'))
                .set('Authorization', 'Bearer ' + scope.ownerAccessToken)
                .expect('Content-Type', /application\/zip/)
                .expect('Content-Disposition', 'attachment; filename=casper.zip')
                .expect(200)
                .end(function (err) {
                    if (err) {
                        return done(err);
                    }

                    done();
                });
        });

        it('upload theme', function (done) {
            var jsonResponse;

            scope.uploadTheme({themePath: join(__dirname, '/../../../utils/fixtures/themes/valid.zip')})
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    jsonResponse = res.body;

                    should.exist(jsonResponse.themes);
                    testUtils.API.checkResponse(jsonResponse, 'themes');
                    jsonResponse.themes.length.should.eql(1);
                    testUtils.API.checkResponse(jsonResponse.themes[0], 'theme');
                    jsonResponse.themes[0].name.should.eql('valid');

                    // upload same theme again to force override
                    scope.uploadTheme({themePath: join(__dirname, '/../../../utils/fixtures/themes/valid.zip')})
                        .end(function (err, res) {
                            if (err) {
                                return done(err);
                            }

                            jsonResponse = res.body;

                            should.exist(jsonResponse.themes);
                            testUtils.API.checkResponse(jsonResponse, 'themes');
                            jsonResponse.themes.length.should.eql(1);
                            testUtils.API.checkResponse(jsonResponse.themes[0], 'theme');
                            jsonResponse.themes[0].name.should.eql('valid');

                            // ensure tmp theme folder contains two themes now
                            var tmpFolderContents = fs.readdirSync(join(tmpContentPath.name, 'themes'));
                            tmpFolderContents.should.be.an.Array().with.lengthOf(2);
                            tmpFolderContents[0].should.eql('casper');
                            tmpFolderContents[1].should.eql('valid');

                            // Check the Themes API returns the correct result
                            request.get(testUtils.API.getApiQuery('themes/'))
                                .set('Authorization', 'Bearer ' + scope.ownerAccessToken)
                                .expect(200)
                                .end(function (err, res) {
                                    if (err) {
                                        return done(err);
                                    }

                                    var addedTheme, casperTheme;
                                    jsonResponse = res.body;

                                    should.exist(jsonResponse.themes);
                                    testUtils.API.checkResponse(jsonResponse, 'themes');
                                    jsonResponse.themes.length.should.eql(2);

                                    // Casper should be present and still active
                                    casperTheme = _.find(jsonResponse.themes, {name: 'casper'});
                                    should.exist(casperTheme);
                                    testUtils.API.checkResponse(casperTheme, 'theme');
                                    casperTheme.active.should.be.true();

                                    // The added theme should be here
                                    addedTheme = _.find(jsonResponse.themes, {name: 'valid'});
                                    should.exist(addedTheme);
                                    testUtils.API.checkResponse(addedTheme, 'theme');
                                    addedTheme.active.should.be.false();

                                    done();
                                });
                        });
                });
        });

        // NOTE: This test requires the previous upload test
        // @TODO make this test independent
        it('delete theme', function (done) {
            var jsonResponse;

            request.del(testUtils.API.getApiQuery('themes/valid'))
                .set('Authorization', 'Bearer ' + scope.ownerAccessToken)
                .expect(204)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    jsonResponse = res.body;
                    // Delete requests have empty bodies
                    jsonResponse.should.eql({});

                    // ensure tmp theme folder contains one theme again now
                    var tmpFolderContents = fs.readdirSync(join(tmpContentPath.name, 'themes'));
                    tmpFolderContents.should.be.an.Array().with.lengthOf(1);
                    tmpFolderContents[0].should.eql('casper');

                    // Check the settings API returns the correct result
                    request.get(testUtils.API.getApiQuery('themes/'))
                        .set('Authorization', 'Bearer ' + scope.ownerAccessToken)
                        .expect(200)
                        .end(function (err, res) {
                            if (err) {
                                return done(err);
                            }

                            var deletedTheme, casperTheme;
                            jsonResponse = res.body;

                            should.exist(jsonResponse.themes);
                            testUtils.API.checkResponse(jsonResponse, 'themes');
                            jsonResponse.themes.length.should.eql(1);

                            // Casper should be present and still active
                            casperTheme = _.find(jsonResponse.themes, {name: 'casper'});
                            should.exist(casperTheme);
                            testUtils.API.checkResponse(casperTheme, 'theme');
                            casperTheme.active.should.be.true();

                            // The deleted theme should not be here
                            deletedTheme = _.find(jsonResponse.themes, {name: 'valid'});
                            should.not.exist(deletedTheme);

                            done();
                        });
                });
        });
    });

    describe('error cases', function () {
        it('upload invalid theme', function (done) {
            scope.uploadTheme({themePath: join(__dirname, '/../../../utils/fixtures/themes/invalid.zip')})
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    res.statusCode.should.eql(422);
                    res.body.errors.length.should.eql(1);
                    res.body.errors[0].errorType.should.eql('ThemeValidationError');
                    res.body.errors[0].message.should.eql('Theme is not compatible or contains errors.');
                    done();
                });
        });

        it('upload casper.zip', function (done) {
            scope.uploadTheme({themePath: join(__dirname, '/../../../utils/fixtures/themes/casper.zip')})
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    res.statusCode.should.eql(422);
                    res.body.errors.length.should.eql(1);
                    res.body.errors[0].errorType.should.eql('ValidationError');
                    res.body.errors[0].message.should.eql('Please rename your zip, it\'s not allowed to override the default casper theme.');
                    done();
                });
        });

        it('delete casper', function (done) {
            request.del(testUtils.API.getApiQuery('themes/casper'))
                .set('Authorization', 'Bearer ' + scope.ownerAccessToken)
                .expect(422)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    res.body.errors.length.should.eql(1);
                    res.body.errors[0].errorType.should.eql('ValidationError');
                    res.body.errors[0].message.should.eql('Deleting the default casper theme is not allowed.');

                    done();
                });
        });

        it('delete not existent theme', function (done) {
            request.del(testUtils.API.getApiQuery('themes/not-existent'))
                .set('Authorization', 'Bearer ' + scope.ownerAccessToken)
                .expect(404)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    res.body.errors.length.should.eql(1);
                    res.body.errors[0].errorType.should.eql('NotFoundError');
                    res.body.errors[0].message.should.eql('Theme does not exist.');

                    done();
                });
        });

        it('upload non application/zip', function (done) {
            scope.uploadTheme({themePath: join(__dirname, '/../../../utils/fixtures/csv/single-column-with-header.csv')})
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    res.statusCode.should.eql(415);
                    res.body.errors.length.should.eql(1);
                    res.body.errors[0].errorType.should.eql('UnsupportedMediaTypeError');
                    res.body.errors[0].message.should.eql('Please select a valid zip file.');

                    done();
                });
        });

        // @TODO: make this a nicer error!
        it.skip('upload different field name', function (done) {
            scope.uploadTheme({
                themePath: join(__dirname, '/../../../utils/fixtures/csv/single-column-with-header.csv'),
                fieldName: 'wrong'
            }).end(function (err, res) {
                if (err) {
                    return done(err);
                }

                res.statusCode.should.eql(500);
                res.body.errors[0].message.should.eql('Unexpected field');
                done();
            });
        });

        describe('As Editor', function () {
            it('no permissions to upload theme', function (done) {
                scope.uploadTheme({
                    themePath: join(__dirname, '/../../../utils/fixtures/themes/valid.zip'),
                    accessToken: scope.editorAccessToken
                }).end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    res.statusCode.should.eql(403);

                    should.exist(res.body.errors);
                    res.body.errors.should.be.an.Array().with.lengthOf(1);
                    res.body.errors[0].errorType.should.eql('NoPermissionError');
                    res.body.errors[0].message.should.eql('You do not have permission to add themes');

                    done();
                });
            });

            it('no permissions to delete theme', function (done) {
                request.del(testUtils.API.getApiQuery('themes/test'))
                    .set('Authorization', 'Bearer ' + scope.editorAccessToken)
                    .expect(403)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        should.exist(res.body.errors);
                        res.body.errors.should.be.an.Array().with.lengthOf(1);
                        res.body.errors[0].errorType.should.eql('NoPermissionError');
                        res.body.errors[0].message.should.eql('You do not have permission to destroy themes');

                        done();
                    });
            });

            it('no permissions to download theme', function (done) {
                request.get(testUtils.API.getApiQuery('themes/casper/download/'))
                    .set('Authorization', 'Bearer ' + scope.editorAccessToken)
                    .expect(403)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        should.exist(res.body.errors);
                        res.body.errors.should.be.an.Array().with.lengthOf(1);
                        res.body.errors[0].errorType.should.eql('NoPermissionError');
                        res.body.errors[0].message.should.eql('You do not have permission to read themes');

                        done();
                    });
            });
        });
    });
});
