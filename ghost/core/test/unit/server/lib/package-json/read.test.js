require('should');

const tmp = require('tmp');
const join = require('path').join;
const fs = require('fs-extra');
const packageJSON = require('../../../../../core/server/lib/package-json');

describe('package-json read', function () {
    describe('readPackages', function () {
        it('should read directory and ignore unneeded items', function (done) {
            const packagePath = tmp.dirSync({unsafeCleanup: true});

            // create example theme
            fs.mkdirSync(join(packagePath.name, 'casper'));
            fs.writeFileSync(join(packagePath.name, 'casper', 'index.hbs'), '');

            // create some trash
            fs.mkdirSync(join(packagePath.name, 'node_modules'));
            fs.mkdirSync(join(packagePath.name, 'bower_components'));
            fs.mkdirSync(join(packagePath.name, '.git'));
            fs.writeFileSync(join(packagePath.name, '.DS_Store'), '');

            packageJSON.readPackages(packagePath.name)
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
            let packagePath;
            let pkgJson;

            packagePath = tmp.dirSync({unsafeCleanup: true});
            pkgJson = JSON.stringify({
                name: 'test',
                version: '0.0.0'
            });

            // create example theme
            fs.mkdirSync(join(packagePath.name, 'testtheme'));
            fs.writeFileSync(join(packagePath.name, 'testtheme', 'package.json'), pkgJson);
            fs.writeFileSync(join(packagePath.name, 'testtheme', 'index.hbs'), '');

            packageJSON.readPackages(packagePath.name)
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
            let packagePath;
            let pkgJson;

            packagePath = tmp.dirSync({unsafeCleanup: true});
            pkgJson = JSON.stringify({
                name: 'test'
            });

            // create example theme
            fs.mkdirSync(join(packagePath.name, 'testtheme'));
            fs.writeFileSync(join(packagePath.name, 'testtheme', 'package.json'), pkgJson);
            fs.writeFileSync(join(packagePath.name, 'testtheme', 'index.hbs'), '');

            packageJSON.readPackages(packagePath.name)
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

        it('should read directory and include symlinked directories', function (done) {
            let packagePath;
            let pkgJson;

            packagePath = tmp.dirSync({unsafeCleanup: true});
            pkgJson = JSON.stringify({
                name: 'test'
            });

            // create example theme
            fs.mkdirSync(join(packagePath.name, 'testtheme'));
            fs.writeFileSync(join(packagePath.name, 'testtheme', 'package.json'), pkgJson);
            fs.writeFileSync(join(packagePath.name, 'testtheme', 'index.hbs'), '');

            // Symlink one theme to the other so we should have 2 themes
            fs.symlinkSync(join(packagePath.name, 'testtheme'), join(packagePath.name, 'testtheme2'));

            packageJSON.readPackages(packagePath.name)
                .then(function (pkgs) {
                    pkgs.should.eql({
                        testtheme: {
                            name: 'testtheme',
                            path: join(packagePath.name, 'testtheme'),
                            'package.json': null
                        },
                        testtheme2: {
                            name: 'testtheme2',
                            path: join(packagePath.name, 'testtheme2'),
                            'package.json': null
                        }
                    });

                    done();
                })
                .catch(done)
                .finally(packagePath.removeCallback);
        });

        it('should read directory and ignore invalid symlinks', async function () {
            const packagePath = tmp.dirSync({unsafeCleanup: true});
            const pkgJson = JSON.stringify({
                name: 'test'
            });

            // create example theme
            fs.mkdirSync(join(packagePath.name, 'testtheme'));
            fs.writeFileSync(join(packagePath.name, 'testtheme', 'package.json'), pkgJson);
            fs.writeFileSync(join(packagePath.name, 'testtheme', 'index.hbs'), '');

            // Create a symlink that has a missing source dir
            fs.symlinkSync(join(packagePath.name, 'missing-dir'), join(packagePath.name, 'source'));

            try {
                const pkgs = await packageJSON.readPackages(packagePath.name);
                pkgs.should.eql({
                    testtheme: {
                        name: 'testtheme',
                        path: join(packagePath.name, 'testtheme'),
                        'package.json': null
                    }
                });
            } finally {
                await packagePath.removeCallback();
            }
        });
    });

    describe('readPackage', function () {
        it('should read directory and ignore unneeded items', function (done) {
            const packagePath = tmp.dirSync({unsafeCleanup: true});

            // create example theme
            fs.mkdirSync(join(packagePath.name, 'casper'));
            fs.writeFileSync(join(packagePath.name, 'casper', 'index.hbs'), '');

            // create some trash
            fs.mkdirSync(join(packagePath.name, 'node_modules'));
            fs.mkdirSync(join(packagePath.name, 'bower_components'));
            fs.mkdirSync(join(packagePath.name, '.git'));
            fs.writeFileSync(join(packagePath.name, '.DS_Store'), '');

            packageJSON.readPackage(packagePath.name, 'casper')
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
            let packagePath;
            let pkgJson;

            packagePath = tmp.dirSync({unsafeCleanup: true});
            pkgJson = JSON.stringify({
                name: 'test',
                version: '0.0.0'
            });

            // create example theme
            fs.mkdirSync(join(packagePath.name, 'testtheme'));
            fs.writeFileSync(join(packagePath.name, 'testtheme', 'package.json'), pkgJson);
            fs.writeFileSync(join(packagePath.name, 'testtheme', 'index.hbs'), '');

            packageJSON.readPackage(packagePath.name, 'testtheme')
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
            let packagePath;
            let pkgJson;

            packagePath = tmp.dirSync({unsafeCleanup: true});
            pkgJson = JSON.stringify({
                name: 'test'
            });

            // create example theme
            fs.mkdirSync(join(packagePath.name, 'testtheme'));
            fs.writeFileSync(join(packagePath.name, 'testtheme', 'package.json'), pkgJson);
            fs.writeFileSync(join(packagePath.name, 'testtheme', 'index.hbs'), '');

            packageJSON.readPackage(packagePath.name, 'testtheme')
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
            const packagePath = tmp.dirSync({unsafeCleanup: true});

            // create trash
            fs.writeFileSync(join(packagePath.name, 'casper.zip'), '');
            fs.writeFileSync(join(packagePath.name, '.DS_Store'), '');

            // create actual theme
            fs.mkdirSync(join(packagePath.name, 'casper'));
            fs.mkdirSync(join(packagePath.name, 'casper', 'partials'));
            fs.writeFileSync(join(packagePath.name, 'casper', 'index.hbs'), '');
            fs.writeFileSync(join(packagePath.name, 'casper', 'partials', 'navigation.hbs'), '');
            fs.mkdirSync(join(packagePath.name, 'not-casper'));
            fs.writeFileSync(join(packagePath.name, 'not-casper', 'index.hbs'), '');

            packageJSON.readPackage(packagePath.name, 'casper')
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
            const packagePath = tmp.dirSync({unsafeCleanup: true});

            // create trash
            fs.writeFileSync(join(packagePath.name, 'casper.zip'), '');
            fs.writeFileSync(join(packagePath.name, '.DS_Store'), '');

            packageJSON.readPackage(packagePath.name, 'casper')
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
            const packagePath = tmp.dirSync({unsafeCleanup: true});

            // create trash
            fs.writeFileSync(join(packagePath.name, 'casper.zip'), '');
            fs.writeFileSync(join(packagePath.name, '.DS_Store'), '');

            packageJSON.readPackage(packagePath.name, 'casper.zip')
                .then(function (pkg) {
                    pkg.should.eql({});

                    done();
                })
                .catch(done)
                .finally(packagePath.removeCallback);
        });
    });
});
