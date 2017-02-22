var should = require('should'),
    tmp = require('tmp'),
    join = require('path').join,
    fs = require('fs'),

    // Things we are testing
    readThemes = require('../../../server/utils/read-themes'),
    packages = require('../../../server/utils/packages'),
    parsePackageJson = packages.parsePackageJSON,
    readPackages = packages.readPackages,
    filterPackages = packages.filterPackages;

// To stop jshint complaining
should.equal(true, true);

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
        // @TODO: introduce some non-theme package examples
        var casper = {
                '.gitignore': '~/content/themes/casper/.gitignore',
                LICENSE: '~/content/themes/casper/LICENSE',
                'README.md': '~/content/themes/casper/README.md',
                assets: {
                    css: {},
                    fonts: {},
                    js: {},
                    'screenshot-desktop.jpg': '~/content/themes/casper/assets/screenshot-desktop.jpg',
                    'screenshot-mobile.jpg': '~/content/themes/casper/assets/screenshot-mobile.jpg'
                },
                'author.hbs': '~/content/themes/casper/author.hbs',
                'default.hbs': '~/content/themes/casper/default.hbs',
                'index.hbs': '~/content/themes/casper/index.hbs',
                'package.json': {
                    name: 'casper',
                    description: 'The default personal blogging theme for Ghost. Beautiful, minimal and responsive.',
                    demo: 'https://demo.ghost.io',
                    version: '1.3.5',
                    engines: {},
                    license: 'MIT',
                    screenshots: {},
                    author: {},
                    gpm: {},
                    keywords: {},
                    repository: {},
                    bugs: 'https://github.com/TryGhost/Casper/issues',
                    contributors: 'https://github.com/TryGhost/Casper/graphs/contributors'
                },
                'page.hbs': '~/content/themes/casper/page.hbs',
                partials: {
                    'loop.hbs': '~/content/themes/casper/partials/loop.hbs',
                    'navigation.hbs': '~/content/themes/casper/partials/navigation.hbs'
                },
                'post-test-thing.hbs': '~/content/themes/casper/post-test-thing.hbs',
                'post.hbs': '~/content/themes/casper/post.hbs',
                'tag.hbs': '~/content/themes/casper/tag.hbs'
            },
            simplePackage = {
                'default.hbs': '~/content/themes/casper/default.hbs',
                'index.hbs': '~/content/themes/casper/index.hbs',
                'package.json': {
                    name: 'simple',
                    version: '0.1.0'
                }
            },
            missingPackageJson = {
                'default.hbs': '~/content/themes/casper/default.hbs',
                'index.hbs': '~/content/themes/casper/index.hbs'
            };

        it('should filter packages correctly', function () {
            var result = filterPackages({casper: casper}),
                package1;

            result.should.be.an.Array().with.lengthOf(1);
            package1 = result[0];

            package1.should.be.an.Object().with.properties('name', 'package');
            Object.keys(package1).should.be.an.Array().with.lengthOf(2);
            package1.name.should.eql('casper');
            package1.package.should.be.an.Object().with.properties('name', 'version');
        });

        it('should filter packages and handle a single active package string', function () {
            var result = filterPackages({casper: casper, simple: simplePackage}, 'casper'),
                package1, package2;

            result.should.be.an.Array().with.lengthOf(2);
            package1 = result[0];
            package2 = result[1];

            package1.should.be.an.Object().with.properties('name', 'package', 'active');
            Object.keys(package1).should.be.an.Array().with.lengthOf(3);
            package1.name.should.eql('casper');
            package1.package.should.be.an.Object().with.properties('name', 'version');
            package1.active.should.be.true();

            package2.should.be.an.Object().with.properties('name', 'package');
            Object.keys(package2).should.be.an.Array().with.lengthOf(2);
            package2.name.should.eql('simple');
            package2.package.should.be.an.Object().with.properties('name', 'version');
            should.not.exist(package2.active);
        });

        it('should filter packages and handle an array of active packages', function () {
            var result = filterPackages({casper: casper, simple: simplePackage}, ['casper', 'simple']),
                package1, package2;

            result.should.be.an.Array().with.lengthOf(2);
            package1 = result[0];
            package2 = result[1];

            package1.should.be.an.Object().with.properties('name', 'package', 'active');
            Object.keys(package1).should.be.an.Array().with.lengthOf(3);
            package1.name.should.eql('casper');
            package1.package.should.be.an.Object().with.properties('name', 'version');
            package1.active.should.be.true();

            package2.should.be.an.Object().with.properties('name', 'package', 'active');
            Object.keys(package2).should.be.an.Array().with.lengthOf(3);
            package2.name.should.eql('simple');
            package2.package.should.be.an.Object().with.properties('name', 'version');
            package2.active.should.be.true();
        });

        it('handles packages with no package.json even though this makes us sad', function () {
            var result = filterPackages({casper: casper, missing: missingPackageJson}, ['casper']),
                package1, package2;

            result.should.be.an.Array().with.lengthOf(2);
            package1 = result[0];
            package2 = result[1];

            package1.should.be.an.Object().with.properties('name', 'package', 'active');
            Object.keys(package1).should.be.an.Array().with.lengthOf(3);
            package1.name.should.eql('casper');
            package1.package.should.be.an.Object().with.properties('name', 'version');
            package1.active.should.be.true();

            package2.should.be.an.Object().with.properties('name', 'package');
            Object.keys(package2).should.be.an.Array().with.lengthOf(2);
            package2.name.should.eql('missing');
            package2.package.should.be.false();
            should.not.exist(package2.active);
        });

        it('filters out things which are not packages', function () {
            var result = filterPackages({
                '.git': {}, '.anything': {}, 'README.md': {}, _messages: {}
            });
            result.should.be.an.Array().with.lengthOf(0);
        });
    });
});
