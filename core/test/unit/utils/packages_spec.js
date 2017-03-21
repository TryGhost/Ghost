var should = require('should'), // jshint ignore:line
    tmp = require('tmp'),
    join = require('path').join,
    fs = require('fs'),

    // Things we are testing
    packages = require('../../../server/utils/packages'),
    parsePackageJson = packages.parsePackageJSON,
    filterPackages = packages.filterPackages;

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
        it('should read directory and ignore unneeded items', function (done) {
            var packagePath = tmp.dirSync({unsafeCleanup: true});

            // create example theme
            fs.mkdirSync(join(packagePath.name, 'casper'));
            fs.writeFileSync(join(packagePath.name, 'casper', 'index.hbs'));

            // create some trash
            fs.mkdirSync(join(packagePath.name, 'node_modules'));
            fs.mkdirSync(join(packagePath.name, 'bower_components'));
            fs.mkdirSync(join(packagePath.name, '.git'));
            fs.writeFileSync(join(packagePath.name, '.DS_Store'));

            packages.read.all(packagePath.name)
                .then(function (pkgs) {
                    pkgs.should.eql({
                        casper: {
                            name: 'casper',
                            path: join(packagePath.name, 'casper'),
                            'package.json': null
                        }
                    });

                    done();
                })
                .catch(done)
                .finally(packagePath.removeCallback);
        });

        it('should read directory and parse package.json files', function (done) {
            var packagePath, pkgJson;

            packagePath = tmp.dirSync({unsafeCleanup: true});
            pkgJson = JSON.stringify({
                name: 'test',
                version: '0.0.0'
            });

            // create example theme
            fs.mkdirSync(join(packagePath.name, 'testtheme'));
            fs.writeFileSync(join(packagePath.name, 'testtheme', 'package.json'), pkgJson);
            fs.writeFileSync(join(packagePath.name, 'testtheme', 'index.hbs'));

            packages.read.all(packagePath.name)
                .then(function (pkgs) {
                    pkgs.should.eql({
                        testtheme: {
                            name: 'testtheme',
                            path: join(packagePath.name, 'testtheme'),
                            'package.json': {
                                name: 'test',
                                version: '0.0.0'
                            }
                        }
                    });

                    done();
                })
                .catch(done)
                .finally(packagePath.removeCallback);
        });

        it('should read directory and ignore invalid package.json files', function (done) {
            var packagePath, pkgJson;

            packagePath = tmp.dirSync({unsafeCleanup: true});
            pkgJson = JSON.stringify({
                name: 'test'
            });

            // create example theme
            fs.mkdirSync(join(packagePath.name, 'testtheme'));
            fs.writeFileSync(join(packagePath.name, 'testtheme', 'package.json'), pkgJson);
            fs.writeFileSync(join(packagePath.name, 'testtheme', 'index.hbs'));

            packages.read.all(packagePath.name)
                .then(function (pkgs) {
                    pkgs.should.eql({
                        testtheme: {
                            name: 'testtheme',
                            path: join(packagePath.name, 'testtheme'),
                            'package.json': null
                        }
                    });

                    done();
                })
                .catch(done)
                .finally(packagePath.removeCallback);
        });
    });

    describe('Read Package', function () {
        it('should read directory and ignore unneeded items', function (done) {
            var packagePath = tmp.dirSync({unsafeCleanup: true});

            // create example theme
            fs.mkdirSync(join(packagePath.name, 'casper'));
            fs.writeFileSync(join(packagePath.name, 'casper', 'index.hbs'));

            // create some trash
            fs.mkdirSync(join(packagePath.name, 'node_modules'));
            fs.mkdirSync(join(packagePath.name, 'bower_components'));
            fs.mkdirSync(join(packagePath.name, '.git'));
            fs.writeFileSync(join(packagePath.name, '.DS_Store'));

            packages.read.one(packagePath.name, 'casper')
                .then(function (pkgs) {
                    pkgs.should.eql({
                        casper: {
                            name: 'casper',
                            path: join(packagePath.name, 'casper'),
                            'package.json': null
                        }
                    });

                    done();
                })
                .catch(done)
                .finally(packagePath.removeCallback);
        });

        it('should read directory and parse package.json files', function (done) {
            var packagePath, pkgJson;

            packagePath = tmp.dirSync({unsafeCleanup: true});
            pkgJson = JSON.stringify({
                name: 'test',
                version: '0.0.0'
            });

            // create example theme
            fs.mkdirSync(join(packagePath.name, 'testtheme'));
            fs.writeFileSync(join(packagePath.name, 'testtheme', 'package.json'), pkgJson);
            fs.writeFileSync(join(packagePath.name, 'testtheme', 'index.hbs'));

            packages.read.one(packagePath.name, 'testtheme')
                .then(function (pkgs) {
                    pkgs.should.eql({
                        testtheme: {
                            name: 'testtheme',
                            path: join(packagePath.name, 'testtheme'),
                            'package.json': {
                                name: 'test',
                                version: '0.0.0'
                            }
                        }
                    });

                    done();
                })
                .catch(done)
                .finally(packagePath.removeCallback);
        });

        it('should read directory and ignore invalid package.json files', function (done) {
            var packagePath, pkgJson;

            packagePath = tmp.dirSync({unsafeCleanup: true});
            pkgJson = JSON.stringify({
                name: 'test'
            });

            // create example theme
            fs.mkdirSync(join(packagePath.name, 'testtheme'));
            fs.writeFileSync(join(packagePath.name, 'testtheme', 'package.json'), pkgJson);
            fs.writeFileSync(join(packagePath.name, 'testtheme', 'index.hbs'));

            packages.read.one(packagePath.name, 'testtheme')
                .then(function (pkgs) {
                    pkgs.should.eql({
                        testtheme: {
                            name: 'testtheme',
                            path: join(packagePath.name, 'testtheme'),
                            'package.json': null
                        }
                    });

                    done();
                })
                .catch(done)
                .finally(packagePath.removeCallback);
        });

        it('should read directory and include only single requested package', function (done) {
            var packagePath = tmp.dirSync({unsafeCleanup: true});

            // create trash
            fs.writeFileSync(join(packagePath.name, 'casper.zip'));
            fs.writeFileSync(join(packagePath.name, '.DS_Store'));

            // create actual theme
            fs.mkdirSync(join(packagePath.name, 'casper'));
            fs.mkdirSync(join(packagePath.name, 'casper', 'partials'));
            fs.writeFileSync(join(packagePath.name, 'casper', 'index.hbs'));
            fs.writeFileSync(join(packagePath.name, 'casper', 'partials', 'navigation.hbs'));
            fs.mkdirSync(join(packagePath.name, 'not-casper'));
            fs.writeFileSync(join(packagePath.name, 'not-casper', 'index.hbs'));

            packages.read.one(packagePath.name, 'casper')
                .then(function (pkgs) {
                    pkgs.should.eql({
                        casper: {
                            name: 'casper',
                            path: join(packagePath.name, 'casper'),
                            'package.json': null
                        }
                    });

                    done();
                })
                .catch(done)
                .finally(packagePath.removeCallback);
        });

        it('should return an error if package cannot be found', function (done) {
            var packagePath = tmp.dirSync({unsafeCleanup: true});

            // create trash
            fs.writeFileSync(join(packagePath.name, 'casper.zip'));
            fs.writeFileSync(join(packagePath.name, '.DS_Store'));

            packages.read.one(packagePath.name, 'casper')
                .then(function () {
                    done('Should have thrown an error');
                })
                .catch(function (err) {
                    err.message.should.eql('Package not found');
                    done();
                })
                .finally(packagePath.removeCallback);
        });

        it('should return empty object if package is not a directory', function (done) {
            var packagePath = tmp.dirSync({unsafeCleanup: true});

            // create trash
            fs.writeFileSync(join(packagePath.name, 'casper.zip'));
            fs.writeFileSync(join(packagePath.name, '.DS_Store'));

            packages.read.one(packagePath.name, 'casper.zip')
                .then(function (pkg) {
                    pkg.should.eql({});

                    done();
                })
                .catch(done)
                .finally(packagePath.removeCallback);
        });
    });

    describe('Filter Packages', function () {
        // @TODO: introduce some non-theme package examples
        var casper = {
                name: 'casper',
                path: '~/content/themes/casper',
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
                }
            },
            simplePackage = {
                name: 'simple',
                path: '~/content/themes/simple',
                'package.json': {
                    name: 'simple',
                    version: '0.1.0'
                }
            },
            missingPackageJson = {
                name: 'missing',
                path: '~/content/themes/missing',
                'package.json': null
            };

        it('should filter packages correctly', function () {
            var result = filterPackages({casper: casper}),
                package1;

            result.should.be.an.Array().with.lengthOf(1);
            package1 = result[0];

            package1.should.be.an.Object().with.properties('name', 'package', 'active');
            Object.keys(package1).should.be.an.Array().with.lengthOf(3);
            package1.name.should.eql('casper');
            package1.package.should.be.an.Object().with.properties('name', 'version');
            package1.active.should.be.false();
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

            package2.should.be.an.Object().with.properties('name', 'package', 'active');
            Object.keys(package2).should.be.an.Array().with.lengthOf(3);
            package2.name.should.eql('simple');
            package2.package.should.be.an.Object().with.properties('name', 'version');
            package2.active.should.be.false();
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

            package2.should.be.an.Object().with.properties('name', 'package', 'active');
            Object.keys(package2).should.be.an.Array().with.lengthOf(3);
            package2.name.should.eql('missing');
            package2.package.should.be.false();
            package2.active.should.be.false();
        });

        it('filters out things which are not packages', function () {
            var result = filterPackages({
                '.git': {}, '.anything': {}, 'README.md': {}, _messages: {}
            });
            result.should.be.an.Array().with.lengthOf(0);
        });
    });
});
