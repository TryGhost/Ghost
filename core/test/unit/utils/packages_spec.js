var should = require('should'),
    tmp = require('tmp'),
    join = require('path').join,
    fs = require('fs'),

    // Things we are testing
    readThemes = require('../../../server/utils/read-themes'),
    packages = require('../../../server/utils/packages'),
    parsePackageJson = packages.parsePackageJSON,
    readPackages = packages.readPackages;

// To stop jshint complaining
should.equal(true, true);

describe('Package Utils', function () {
    describe('Parse Package.json', function () {
        it('should parse valid package.json', function (done) {
            var pkgJson, tmpFile;

            tmpFile = tmp.fileSync();
            pkgJson = JSON.stringify({
                name: 'test',
                version: '0.0.0'
            });

            fs.writeSync(tmpFile.fd, pkgJson);

            parsePackageJson(tmpFile.name)
                .then(function (pkg) {
                    pkg.should.eql({
                        name: 'test',
                        version: '0.0.0'
                    });

                    done();
                })
                .catch(done)
                .finally(tmpFile.removeCallback);
        });

        it('should fail when name is missing', function (done) {
            var pkgJson, tmpFile;

            tmpFile = tmp.fileSync();
            pkgJson = JSON.stringify({
                version: '0.0.0'
            });

            fs.writeSync(tmpFile.fd, pkgJson);

            parsePackageJson(tmpFile.name)
                .then(function () {
                    done(new Error('parsePackageJson succeeded, but should\'ve failed'));
                })
                .catch(function (err) {
                    err.message.should.equal('"name" or "version" is missing from theme package.json file.');
                    err.context.should.equal(tmpFile.name);
                    err.help.should.equal('This will be required in future. Please see http://docs.ghost.org/themes/');

                    done();
                })
                .catch(done)
                .finally(tmpFile.removeCallback);
        });

        it('should fail when version is missing', function (done) {
            var pkgJson, tmpFile;

            tmpFile = tmp.fileSync();
            pkgJson = JSON.stringify({
                name: 'test'
            });

            fs.writeSync(tmpFile.fd, pkgJson);

            parsePackageJson(tmpFile.name)
                .then(function () {
                    done(new Error('parsePackageJson succeeded, but should\'ve failed'));
                })
                .catch(function (err) {
                    err.message.should.equal('"name" or "version" is missing from theme package.json file.');
                    err.context.should.equal(tmpFile.name);
                    err.help.should.equal('This will be required in future. Please see http://docs.ghost.org/themes/');

                    done();
                })
                .catch(done)
                .finally(tmpFile.removeCallback);
        });

        it('should fail when JSON is invalid', function (done) {
            var pkgJson, tmpFile;

            tmpFile = tmp.fileSync();
            pkgJson = '{name:"test"}';

            fs.writeSync(tmpFile.fd, pkgJson);

            parsePackageJson(tmpFile.name)
                .then(function () {
                    done(new Error('parsePackageJson succeeded, but should\'ve failed'));
                })
                .catch(function (err) {
                    err.message.should.equal('Theme package.json file is malformed');
                    err.context.should.equal(tmpFile.name);
                    err.help.should.equal('This will be required in future. Please see http://docs.ghost.org/themes/');

                    done();
                })
                .catch(done)
                .finally(tmpFile.removeCallback);
        });

        it('should fail when file is missing', function (done) {
            var tmpFile = tmp.fileSync();

            tmpFile.removeCallback();
            parsePackageJson(tmpFile.name)
                .then(function () {
                    done(new Error('parsePackageJson succeeded, but should\'ve failed'));
                })
                .catch(function (err) {
                    err.message.should.equal('Could not read package.json file');
                    err.context.should.equal(tmpFile.name);

                    done();
                })
                .catch(done);
        });
    });

    describe('Read Packages', function () {
        it('should read directory recursively', function (done) {
            var themePath = tmp.dirSync({unsafeCleanup: true});

            // create example theme
            fs.mkdirSync(join(themePath.name, 'partials'));
            fs.writeFileSync(join(themePath.name, 'index.hbs'));
            fs.writeFileSync(join(themePath.name, 'partials', 'navigation.hbs'));

            readPackages(themePath.name)
                .then(function (tree) {
                    tree.should.eql({
                        partials: {
                            'navigation.hbs': join(themePath.name, 'partials', 'navigation.hbs')
                        },
                        'index.hbs': join(themePath.name, 'index.hbs')
                    });

                    done();
                })
                .catch(done)
                .finally(themePath.removeCallback);
        });

        it('should read directory and ignore unneeded items', function (done) {
            var themePath = tmp.dirSync({unsafeCleanup: true});

            // create example theme
            fs.mkdirSync(join(themePath.name, 'partials'));
            fs.writeFileSync(join(themePath.name, 'index.hbs'));
            fs.writeFileSync(join(themePath.name, 'partials', 'navigation.hbs'));

            // create some trash
            fs.mkdirSync(join(themePath.name, 'node_modules'));
            fs.mkdirSync(join(themePath.name, 'bower_components'));
            fs.mkdirSync(join(themePath.name, '.git'));
            fs.writeFileSync(join(themePath.name, '.DS_Store'));

            readPackages(themePath.name, {ignore: ['.git']})
                .then(function (tree) {
                    tree.should.eql({
                        partials: {
                            'navigation.hbs': join(themePath.name, 'partials', 'navigation.hbs')
                        },
                        'index.hbs': join(themePath.name, 'index.hbs')
                    });

                    done();
                })
                .catch(done)
                .finally(themePath.removeCallback);
        });

        it('should read directory and parse package.json files', function (done) {
            var themePath, pkgJson;

            themePath = tmp.dirSync({unsafeCleanup: true});
            pkgJson = JSON.stringify({
                name: 'test',
                version: '0.0.0'
            });

            // create example theme
            fs.mkdirSync(join(themePath.name, 'partials'));
            fs.writeFileSync(join(themePath.name, 'package.json'), pkgJson);
            fs.writeFileSync(join(themePath.name, 'index.hbs'));
            fs.writeFileSync(join(themePath.name, 'partials', 'navigation.hbs'));

            readPackages(themePath.name)
                .then(function (tree) {
                    tree.should.eql({
                        partials: {
                            'navigation.hbs': join(themePath.name, 'partials', 'navigation.hbs')
                        },
                        'index.hbs': join(themePath.name, 'index.hbs'),
                        'package.json': {
                            name: 'test',
                            version: '0.0.0'
                        }
                    });

                    done();
                })
                .catch(done)
                .finally(themePath.removeCallback);
        });

        it('should read directory and ignore invalid package.json files', function (done) {
            var themePath, pkgJson;

            themePath = tmp.dirSync({unsafeCleanup: true});
            pkgJson = JSON.stringify({
                name: 'test'
            });

            // create example theme
            fs.mkdirSync(join(themePath.name, 'partials'));
            fs.writeFileSync(join(themePath.name, 'package.json'), pkgJson);
            fs.writeFileSync(join(themePath.name, 'index.hbs'));
            fs.writeFileSync(join(themePath.name, 'partials', 'navigation.hbs'));

            readPackages(themePath.name)
                .then(function (tree) {
                    tree.should.eql({
                        partials: {
                            'navigation.hbs': join(themePath.name, 'partials', 'navigation.hbs')
                        },
                        'index.hbs': join(themePath.name, 'index.hbs'),
                        'package.json': null
                    });

                    done();
                })
                .catch(done)
                .finally(themePath.removeCallback);
        });
    });

    // NOTE: this probably shouldn't be here, but it makes more sense than in
    // The server utils spec.js and has its own home in 1.0/alpha already.
    describe('Read Themes', function () {
        it('should read directory and include only folders', function (done) {
            var themesPath = tmp.dirSync({unsafeCleanup: true});

            // create trash
            fs.writeFileSync(join(themesPath.name, 'casper.zip'));
            fs.writeFileSync(join(themesPath.name, '.DS_Store'));

            // create actual theme
            fs.mkdirSync(join(themesPath.name, 'casper'));
            fs.mkdirSync(join(themesPath.name, 'casper', 'partials'));
            fs.writeFileSync(join(themesPath.name, 'casper', 'index.hbs'));
            fs.writeFileSync(join(themesPath.name, 'casper', 'partials', 'navigation.hbs'));

            readThemes(themesPath.name)
                .then(function (tree) {
                    tree.should.eql({
                        casper: {
                            partials: {
                                'navigation.hbs': join(themesPath.name, 'casper', 'partials', 'navigation.hbs')
                            },
                            'index.hbs': join(themesPath.name, 'casper', 'index.hbs')
                        }
                    });

                    done();
                })
                .catch(done)
                .finally(themesPath.removeCallback);
        });
    });

    describe('Filter Packages', function () {
        it('should filter packages correctly?');
    });
});

