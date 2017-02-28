var testUtils = require('../../../utils'),
    should = require('should'),
    supertest = require('supertest'),
    fs = require('fs-extra'),
    path = require('path'),
    _ = require('lodash'),
    ghost = require('../../../../../core'),
    config = require('../../../../../core/server/config'),
    request;

describe('Themes API', function () {
    var scope = {
        ownerownerAccessToken: '',
        editorAccessToken: '',
        uploadTheme: function uploadTheme(options) {
            var themePath = options.themePath,
                fieldName = options.fieldName || 'theme',
                accessToken = options.accessToken || scope.ownerAccessToken;

            return request.post(testUtils.API.getApiQuery('themes/upload'))
                .set('Authorization', 'Bearer ' + accessToken)
                .attach(fieldName, themePath);
        }
    };

    before(function (done) {
        ghost().then(function (ghostServer) {
            request = supertest.agent(ghostServer.rootApp);
        }).then(function () {
            return testUtils.doAuth(request, 'perms:theme', 'perms:init', 'users:roles:no-owner');
        }).then(function (token) {
            scope.ownerAccessToken = token;

            // 2 === Editor
            request.userIndex = 2;
            return testUtils.doAuth(request);
        }).then(function (token) {
            scope.editorAccessToken = token;
            done();
        }).catch(done);
    });

    after(function (done) {
        // clean successful uploaded themes
        fs.removeSync(config.paths.themePath + '/valid');
        fs.removeSync(config.paths.themePath + '/casper.zip');

        // gscan creates /test/tmp in test mode
        fs.removeSync(config.paths.appRoot + '/test');

        testUtils.clearData()
            .then(function () {
                done();
            }).catch(done);
    });

    describe('success cases', function () {
        it('get all available themes', function (done) {
            request.get(testUtils.API.getApiQuery('settings/'))
                .set('Authorization', 'Bearer ' + scope.ownerAccessToken)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    var availableThemes = _.find(res.body.settings, {key: 'availableThemes'});
                    should.exist(availableThemes);
                    availableThemes.value.length.should.be.above(0);
                    done();
                });
        });

        it('upload theme', function (done) {
            scope.uploadTheme({themePath: path.join(__dirname, '/../../../utils/fixtures/themes/valid.zip')})
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    res.statusCode.should.eql(200);
                    should.exist(res.body.themes);
                    res.body.themes.length.should.eql(1);

                    should.exist(res.body.themes[0].name);
                    should.exist(res.body.themes[0].package);

                    // upload same theme again to force override
                    scope.uploadTheme({themePath: path.join(__dirname, '/../../../utils/fixtures/themes/valid.zip')})
                        .end(function (err) {
                            if (err) {
                                return done(err);
                            }

                            // ensure contains two files (zip and extracted theme)
                            fs.readdirSync(config.paths.themePath).join().match(/valid/gi).length.should.eql(1);

                            // Check the settings API returns the correct result
                            request.get(testUtils.API.getApiQuery('settings/'))
                                .set('Authorization', 'Bearer ' + scope.ownerAccessToken)
                                .expect(200)
                                .end(function (err, res) {
                                    if (err) {
                                        return done(err);
                                    }

                                    var availableThemes, addedTheme;

                                    availableThemes = _.find(res.body.settings, {key: 'availableThemes'}).value;
                                    should.exist(availableThemes);

                                    // The added theme should be here
                                    addedTheme = _.find(availableThemes, {name: 'valid'});
                                    should.exist(addedTheme);

                                    done();
                                });
                        });
                });
        });

        it('get all available themes', function (done) {
            request.get(testUtils.API.getApiQuery('settings/'))
                .set('Authorization', 'Bearer ' + scope.ownerAccessToken)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    var availableThemes = _.find(res.body.settings, {key: 'availableThemes'});
                    should.exist(availableThemes);

                    // ensure the new 'valid' theme is available
                    should.exist(_.find(availableThemes.value, {name: 'valid'}));
                    done();
                });
        });

        it('download theme uuid', function (done) {
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

        it('delete theme uuid', function (done) {
            request.del(testUtils.API.getApiQuery('themes/valid'))
                .set('Authorization', 'Bearer ' + scope.ownerAccessToken)
                .expect(204)
                .end(function (err) {
                    if (err) {
                        return done(err);
                    }

                    fs.existsSync(config.paths.themePath + '/valid').should.eql(false);
                    fs.existsSync(config.paths.themePath + '/valid.zip').should.eql(false);

                    // Check the settings API returns the correct result
                    request.get(testUtils.API.getApiQuery('settings/'))
                        .set('Authorization', 'Bearer ' + scope.ownerAccessToken)
                        .expect(200)
                        .end(function (err, res) {
                            if (err) {
                                return done(err);
                            }

                            var availableThemes, deletedTheme;

                            availableThemes = _.find(res.body.settings, {key: 'availableThemes'}).value;
                            should.exist(availableThemes);

                            // The deleted theme should not be here
                            deletedTheme = _.find(availableThemes, {name: 'valid'});
                            should.not.exist(deletedTheme);

                            done();
                        });
                });
        });
    });

    describe('error cases', function () {
        it('upload invalid theme', function (done) {
            scope.uploadTheme({themePath: path.join(__dirname, '/../../../utils/fixtures/themes/invalid.zip')})
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
            scope.uploadTheme({themePath: path.join(__dirname, '/../../../utils/fixtures/themes/casper.zip')})
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
                .end(function (err) {
                    if (err) {
                        return done(err);
                    }

                    done();
                });
        });

        it('delete not existent theme', function (done) {
            request.del(testUtils.API.getApiQuery('themes/not-existent'))
                .set('Authorization', 'Bearer ' + scope.ownerAccessToken)
                .expect(404)
                .end(function (err) {
                    if (err) {
                        return done(err);
                    }

                    done();
                });
        });

        it('upload non application/zip', function (done) {
            scope.uploadTheme({themePath: path.join(__dirname, '/../../../utils/fixtures/csv/single-column-with-header.csv')})
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    res.statusCode.should.eql(415);
                    done();
                });
        });

        it('upload different field name', function (done) {
            scope.uploadTheme({
                themePath: path.join(__dirname, '/../../../utils/fixtures/csv/single-column-with-header.csv'),
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
                    themePath: path.join(__dirname, '/../../../utils/fixtures/themes/valid.zip'),
                    accessToken: scope.editorAccessToken
                }).end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    res.statusCode.should.eql(403);
                    done();
                });
            });

            it('no permissions to delete theme', function (done) {
                request.del(testUtils.API.getApiQuery('themes/test'))
                    .set('Authorization', 'Bearer ' + scope.editorAccessToken)
                    .expect(403)
                    .end(function (err) {
                        if (err) {
                            return done(err);
                        }

                        done();
                    });
            });

            it('no permissions to download theme', function (done) {
                request.get(testUtils.API.getApiQuery('themes/casper/download/'))
                    .set('Authorization', 'Bearer ' + scope.editorAccessToken)
                    .expect(403)
                    .end(function (err) {
                        if (err) {
                            return done(err);
                        }

                        done();
                    });
            });
        });
    });
});
