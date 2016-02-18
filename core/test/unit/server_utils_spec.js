/*globals describe, it, beforeEach, afterEach*/
var should          = require('should'),
    sinon           = require('sinon'),
    nock            = require('nock'),
    parsePackageJson = require('../../server/utils/parse-package-json'),
    validateThemes  = require('../../server/utils/validate-themes'),
    readDirectory   = require('../../server/utils/read-directory'),
    readThemes      = require('../../server/utils/read-themes'),
    gravatar        = require('../../server/utils/gravatar'),
    tempfile        = require('../utils/tempfile'),
    utils           = require('../../server/utils'),
    join            = require('path').join,
    rm              = require('rimraf-then'),
    fs              = require('fs');

// To stop jshint complaining
should.equal(true, true);

describe('Server Utilities', function () {
    describe('Safe String', function () {
        var safeString = utils.safeString,
            options = {};

        it('should remove beginning and ending whitespace', function () {
            var result = safeString(' stringwithspace ', options);
            result.should.equal('stringwithspace');
        });

        it('should remove non ascii characters', function () {
            var result = safeString('howtowin✓', options);
            result.should.equal('howtowin');
        });

        it('should replace spaces with dashes', function () {
            var result = safeString('how to win', options);
            result.should.equal('how-to-win');
        });

        it('should replace most special characters with dashes', function () {
            var result = safeString('a:b/c?d#e[f]g!h$i&j(k)l*m+n,o;{p}=q\\r%s<t>u|v^w~x£y"z@1.2`3', options);
            result.should.equal('a-b-c-d-e-f-g-h-i-j-k-l-m-n-o-p-q-r-s-t-u-v-w-x-y-z-1-2-3');
        });

        it('should replace all of the html4 compat symbols in ascii except hyphen and underscore', function () {
            // note: This is missing the soft-hyphen char that isn't much-liked by linters/browsers/etc,
            // it passed the test before it was removed
            var result = safeString('!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~¡¢£¤¥¦§¨©ª«¬®¯°±²³´µ¶·¸¹º»¼½¾¿');
            result.should.equal('_-c-y-ss-c-a-r-deg-23up-1o-1-41-23-4');
        });

        it('should replace all of the foreign chars in ascii', function () {
            var result = safeString('ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ');
            result.should.equal('aaaaaaaeceeeeiiiidnoooooxouuuuuthssaaaaaaaeceeeeiiiidnooooo-ouuuuythy');
        });

        it('should remove special characters at the beginning of a string', function () {
            var result = safeString('.Not special', options);
            result.should.equal('not-special');
        });

        it('should remove apostrophes ', function () {
            var result = safeString('how we shouldn\'t be', options);
            result.should.equal('how-we-shouldnt-be');
        });

        it('should convert to lowercase', function () {
            var result = safeString('This has Upper Case', options);
            result.should.equal('this-has-upper-case');
        });

        it('should convert multiple dashes into a single dash', function () {
            var result = safeString('This :) means everything', options);
            result.should.equal('this-means-everything');
        });

        it('should remove trailing dashes from the result', function () {
            var result = safeString('This.', options);
            result.should.equal('this');
        });

        it('should handle pound signs', function () {
            var result = safeString('WHOOPS! I spent all my £ again!', options);
            result.should.equal('whoops-i-spent-all-my-again');
        });

        it('should properly handle unicode punctuation conversion', function () {
            var result = safeString('に間違いがないか、再度確認してください。再読み込みしてください。', options);
            result.should.equal('nijian-wei-iganaika-zai-du-que-ren-sitekudasai-zai-du-miip-misitekudasai');
        });

        it('should not lose or convert dashes if options are passed with truthy importing flag', function () {
            var result,
                options = {importing: true};
            result = safeString('-slug-with-starting-ending-and---multiple-dashes-', options);
            result.should.equal('-slug-with-starting-ending-and---multiple-dashes-');
        });

        it('should still remove/convert invalid characters when passed options with truthy importing flag', function () {
            var result,
                options = {importing: true};
            result = safeString('-slug-&with-✓-invalid-characters-に\'', options);
            result.should.equal('-slug--with--invalid-characters-ni');
        });
    });

    describe('parse-package-json', function () {
        it('should parse valid package.json', function (done) {
            var pkgJson, tmpPath;

            tmpPath = tempfile();
            pkgJson = JSON.stringify({
                name: 'test',
                version: '0.0.0'
            });

            fs.writeFileSync(tmpPath, pkgJson);

            parsePackageJson(tmpPath)
                .then(function (pkg) {
                    pkg.should.eql({
                        name: 'test',
                        version: '0.0.0'
                    });

                    done();
                })
                .catch(done)
                .finally(function () {
                    return rm(tmpPath);
                });
        });

        it('should fail when name is missing', function (done) {
            var pkgJson, tmpPath;

            tmpPath = tempfile();
            pkgJson = JSON.stringify({
                version: '0.0.0'
            });

            fs.writeFileSync(tmpPath, pkgJson);

            parsePackageJson(tmpPath)
                .then(function () {
                    done(new Error('parsePackageJson succeeded, but should\'ve failed'));
                })
                .catch(function (err) {
                    err.message.should.equal('"name" or "version" is missing from theme package.json file.');
                    err.context.should.equal(tmpPath);
                    err.help.should.equal('This will be required in future. Please see http://docs.ghost.org/themes/');

                    done();
                })
                .finally(function () {
                    return rm(tmpPath);
                });
        });

        it('should fail when version is missing', function (done) {
            var pkgJson, tmpPath;

            tmpPath = tempfile();
            pkgJson = JSON.stringify({
                name: 'test'
            });

            fs.writeFileSync(tmpPath, pkgJson);

            parsePackageJson(tmpPath)
                .then(function () {
                    done(new Error('parsePackageJson succeeded, but should\'ve failed'));
                })
                .catch(function (err) {
                    err.message.should.equal('"name" or "version" is missing from theme package.json file.');
                    err.context.should.equal(tmpPath);
                    err.help.should.equal('This will be required in future. Please see http://docs.ghost.org/themes/');

                    done();
                })
                .finally(function () {
                    return rm(tmpPath);
                });
        });

        it('should fail when JSON is invalid', function (done) {
            var pkgJson, tmpPath;

            tmpPath = tempfile();
            pkgJson = '{name:"test"}';

            fs.writeFileSync(tmpPath, pkgJson);

            parsePackageJson(tmpPath)
                .then(function () {
                    done(new Error('parsePackageJson succeeded, but should\'ve failed'));
                })
                .catch(function (err) {
                    err.message.should.equal('Theme package.json file is malformed');
                    err.context.should.equal(tmpPath);
                    err.help.should.equal('This will be required in future. Please see http://docs.ghost.org/themes/');

                    done();
                })
                .finally(function () {
                    return rm(tmpPath);
                });
        });

        it('should fail when file is missing', function (done) {
            var tmpPath = tempfile();

            parsePackageJson(tmpPath)
                .then(function () {
                    done(new Error('parsePackageJson succeeded, but should\'ve failed'));
                })
                .catch(function (err) {
                    err.message.should.equal('Could not read package.json file');
                    err.context.should.equal(tmpPath);

                    done();
                })
                .finally(function () {
                    return rm(tmpPath);
                });
        });
    });

    describe('read-directory', function () {
        it('should read directory recursively', function (done) {
            var themePath = tempfile();

            // create example theme
            fs.mkdirSync(themePath);
            fs.mkdirSync(join(themePath, 'partials'));
            fs.writeFileSync(join(themePath, 'index.hbs'));
            fs.writeFileSync(join(themePath, 'partials', 'navigation.hbs'));

            readDirectory(themePath)
                .then(function (tree) {
                    tree.should.eql({
                        partials: {
                            'navigation.hbs': join(themePath, 'partials', 'navigation.hbs')
                        },
                        'index.hbs': join(themePath, 'index.hbs')
                    });

                    done();
                })
                .catch(done)
                .finally(function () {
                    return rm(themePath);
                });
        });

        it('should read directory and ignore unneeded items', function (done) {
            var themePath = tempfile();

            // create example theme
            fs.mkdirSync(themePath);
            fs.mkdirSync(join(themePath, 'partials'));
            fs.writeFileSync(join(themePath, 'index.hbs'));
            fs.writeFileSync(join(themePath, 'partials', 'navigation.hbs'));

            // create some trash
            fs.mkdirSync(join(themePath, 'node_modules'));
            fs.mkdirSync(join(themePath, 'bower_components'));
            fs.mkdirSync(join(themePath, '.git'));
            fs.writeFileSync(join(themePath, '.DS_Store'));

            readDirectory(themePath, {ignore: ['.git']})
                .then(function (tree) {
                    tree.should.eql({
                        partials: {
                            'navigation.hbs': join(themePath, 'partials', 'navigation.hbs')
                        },
                        'index.hbs': join(themePath, 'index.hbs')
                    });

                    done();
                })
                .catch(done)
                .finally(function () {
                    return rm(themePath);
                });
        });

        it('should read directory and parse package.json files', function (done) {
            var themePath, pkgJson;

            themePath = tempfile();
            pkgJson = JSON.stringify({
                name: 'test',
                version: '0.0.0'
            });

            // create example theme
            fs.mkdirSync(themePath);
            fs.mkdirSync(join(themePath, 'partials'));
            fs.writeFileSync(join(themePath, 'package.json'), pkgJson);
            fs.writeFileSync(join(themePath, 'index.hbs'));
            fs.writeFileSync(join(themePath, 'partials', 'navigation.hbs'));

            readDirectory(themePath)
                .then(function (tree) {
                    tree.should.eql({
                        partials: {
                            'navigation.hbs': join(themePath, 'partials', 'navigation.hbs')
                        },
                        'index.hbs': join(themePath, 'index.hbs'),
                        'package.json': {
                            name: 'test',
                            version: '0.0.0'
                        }
                    });

                    done();
                })
                .catch(done)
                .finally(function () {
                    return rm(themePath);
                });
        });

        it('should read directory and ignore invalid package.json files', function (done) {
            var themePath, pkgJson;

            themePath = tempfile();
            pkgJson = JSON.stringify({
                name: 'test'
            });

            // create example theme
            fs.mkdirSync(themePath);
            fs.mkdirSync(join(themePath, 'partials'));
            fs.writeFileSync(join(themePath, 'package.json'), pkgJson);
            fs.writeFileSync(join(themePath, 'index.hbs'));
            fs.writeFileSync(join(themePath, 'partials', 'navigation.hbs'));

            readDirectory(themePath)
                .then(function (tree) {
                    tree.should.eql({
                        partials: {
                            'navigation.hbs': join(themePath, 'partials', 'navigation.hbs')
                        },
                        'index.hbs': join(themePath, 'index.hbs'),
                        'package.json': null
                    });

                    done();
                })
                .catch(done)
                .finally(function () {
                    return rm(themePath);
                });
        });
    });

    describe('read-themes', function () {
        it('should read directory and include only folders', function (done) {
            var themesPath = tempfile();

            fs.mkdirSync(themesPath);

            // create trash
            fs.writeFileSync(join(themesPath, 'casper.zip'));
            fs.writeFileSync(join(themesPath, '.DS_Store'));

            // create actual theme
            fs.mkdirSync(join(themesPath, 'casper'));
            fs.mkdirSync(join(themesPath, 'casper', 'partials'));
            fs.writeFileSync(join(themesPath, 'casper', 'index.hbs'));
            fs.writeFileSync(join(themesPath, 'casper', 'partials', 'navigation.hbs'));

            readThemes(themesPath)
                .then(function (tree) {
                    tree.should.eql({
                        casper: {
                            partials: {
                                'navigation.hbs': join(themesPath, 'casper', 'partials', 'navigation.hbs')
                            },
                            'index.hbs': join(themesPath, 'casper', 'index.hbs')
                        }
                    });

                    done();
                })
                .catch(done)
                .finally(function () {
                    return rm(themesPath);
                });
        });
    });

    describe('validate-themes', function () {
        it('should return warnings for themes without package.json', function (done) {
            var themesPath, pkgJson;

            themesPath = tempfile();
            pkgJson = JSON.stringify({
                name: 'casper',
                version: '1.0.0'
            });

            fs.mkdirSync(themesPath);

            fs.mkdirSync(join(themesPath, 'casper'));
            fs.mkdirSync(join(themesPath, 'invalid-casper'));

            fs.writeFileSync(join(themesPath, 'casper', 'package.json'), pkgJson);

            validateThemes(themesPath)
                .then(function () {
                    done(new Error('validateThemes succeeded, but should\'ve failed'));
                })
                .catch(function (result) {
                    result.errors.length.should.equal(0);
                    result.warnings.should.eql([{
                        message: 'Found a theme with no package.json file',
                        context: 'Theme name: invalid-casper',
                        help: 'This will be required in future. Please see http://docs.ghost.org/themes/'
                    }]);

                    done();
                })
                .finally(function () {
                    return rm(themesPath);
                });
        });

        it('should return warning for theme with invalid package.json', function (done) {
            var themesPath, pkgJson;

            themesPath = tempfile();
            pkgJson = '{"name":casper}';

            fs.mkdirSync(themesPath);

            fs.mkdirSync(join(themesPath, 'casper'));
            fs.writeFileSync(join(themesPath, 'casper', 'package.json'), pkgJson);

            validateThemes(themesPath)
                .then(function () {
                    done(new Error('validateThemes succeeded, but should\'ve failed'));
                })
                .catch(function (result) {
                    result.errors.length.should.equal(0);
                    result.warnings.should.eql([{
                        message: 'Found a malformed package.json',
                        context: 'Theme name: casper',
                        help: 'Valid package.json will be required in future. Please see http://docs.ghost.org/themes/'
                    }]);

                    done();
                })
                .finally(function () {
                    return rm(themesPath);
                });
        });
    });

    describe('gravatar-lookup', function () {
        var currentEnv = process.env.NODE_ENV;

        beforeEach(function () {
            // give environment a value that will call gravatar
            process.env.NODE_ENV = 'production';
        });

        afterEach(function () {
            // reset the environment
            process.env.NODE_ENV = currentEnv;
        });

        it('can successfully lookup a gravatar url', function (done) {
            nock('https://www.gravatar.com')
                .get('/avatar/ef6dcde5c99bb8f685dd451ccc3e050a?s=250&d=404&r=x')
                .reply(200);

            gravatar.lookup({email: 'exists@example.com'}).then(function (result) {
                should.exist(result);
                should.exist(result.image);
                result.image.should.eql('//www.gravatar.com/avatar/ef6dcde5c99bb8f685dd451ccc3e050a?s=250&d=mm&r=x');

                done();
            }).catch(done);
        });

        it('can handle a non existant gravatar', function (done) {
            nock('https://www.gravatar.com')
                .get('/avatar/3a2963a39ebba98fb0724a1db2f13d63?s=250&d=404&r=x')
                .reply(404);

            gravatar.lookup({email: 'invalid@example.com'}).then(function (result) {
                should.exist(result);
                should.not.exist(result.image);

                done();
            }).catch(done);
        });

        it('will timeout', function (done) {
            nock('https://www.gravatar.com')
                .get('/avatar/ef6dcde5c99bb8f685dd451ccc3e050a?s=250&d=404&r=x')
                .delay(11)
                .reply(200);

            gravatar.lookup({email: 'exists@example.com'}, 10).then(function (result) {
                should.exist(result);
                should.not.exist(result.image);

                done();
            }).catch(done);
        });
    });

    describe('redirect301', function () {
        it('performs a 301 correctly', function (done) {
            var res = {};

            res.set = sinon.spy();

            res.redirect = function (code, path) {
                code.should.equal(301);
                path.should.eql('my/awesome/path');
                res.set.calledWith({'Cache-Control': 'public, max-age=' + utils.ONE_YEAR_S}).should.be.true();

                done();
            };

            utils.redirect301(res, 'my/awesome/path');
        });
    });
});
