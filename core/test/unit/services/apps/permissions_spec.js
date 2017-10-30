var should = require('should'),
    sinon = require('sinon'),
    _ = require('lodash'),
    Promise = require('bluebird'),

    // Stuff we are testing
    AppPermissions = require('../../../../server/services/apps/permissions'),

    sandbox = sinon.sandbox.create();

describe('Apps', function () {
    afterEach(function () {
        sandbox.restore();
    });

    describe('Permissions', function () {
        var noGhostPackageJson = {
                name: 'myapp',
                version: '0.0.1',
                description: 'My example app',
                main: 'index.js',
                scripts: {
                    test: 'echo \'Error: no test specified\' && exit 1'
                },
                author: 'Ghost',
                license: 'MIT',
                dependencies: {
                    'ghost-app': '0.0.1'
                }
            },
            validGhostPackageJson = {
                name: 'myapp',
                version: '0.0.1',
                description: 'My example app',
                main: 'index.js',
                scripts: {
                    test: 'echo \'Error: no test specified\' && exit 1'
                },
                author: 'Ghost',
                license: 'MIT',
                dependencies: {
                    'ghost-app': '0.0.1'
                },
                ghost: {
                    permissions: {
                        posts: ['browse', 'read', 'edit', 'add', 'delete'],
                        users: ['browse', 'read', 'edit', 'add', 'delete'],
                        settings: ['browse', 'read', 'edit', 'add', 'delete']
                    }
                }
            };

        it('has default permissions to read and browse posts', function () {
            should.exist(AppPermissions.DefaultPermissions);

            should.exist(AppPermissions.DefaultPermissions.posts);

            AppPermissions.DefaultPermissions.posts.should.containEql('browse');
            AppPermissions.DefaultPermissions.posts.should.containEql('read');

            // Make it hurt to add more so additional checks are added here
            _.keys(AppPermissions.DefaultPermissions).length.should.equal(1);
        });
        it('uses default permissions if no package.json', function (done) {
            var perms = new AppPermissions('test');

            // No package.json in this directory
            sandbox.stub(perms, 'checkPackageContentsExists').returns(Promise.resolve(false));

            perms.read().then(function (readPerms) {
                should.exist(readPerms);

                readPerms.should.equal(AppPermissions.DefaultPermissions);

                done();
            }).catch(done);
        });
        it('uses default permissions if no ghost object in package.json', function (done) {
            var perms = new AppPermissions('test'),
                noGhostPackageJsonContents = JSON.stringify(noGhostPackageJson, null, 2);

            // package.json IS in this directory
            sandbox.stub(perms, 'checkPackageContentsExists').returns(Promise.resolve(true));
            // no ghost property on package
            sandbox.stub(perms, 'getPackageContents').returns(Promise.resolve(noGhostPackageJsonContents));

            perms.read().then(function (readPerms) {
                should.exist(readPerms);

                readPerms.should.equal(AppPermissions.DefaultPermissions);

                done();
            }).catch(done);
        });
        it('rejects when reading malformed package.json', function (done) {
            var perms = new AppPermissions('test');

            // package.json IS in this directory
            sandbox.stub(perms, 'checkPackageContentsExists').returns(Promise.resolve(true));
            // malformed JSON on package
            sandbox.stub(perms, 'getPackageContents').returns(Promise.reject(new Error('package.json file is malformed')));

            perms.read().then(function (readPerms) {
                /*jshint unused:false*/
                done(new Error('should not resolve'));
            }).catch(function (err) {
                err.message.should.equal('package.json file is malformed');
                done();
            });
        });
        it('reads from package.json in root of app directory', function (done) {
            var perms = new AppPermissions('test'),
                validGhostPackageJsonContents = validGhostPackageJson;

            // package.json IS in this directory
            sandbox.stub(perms, 'checkPackageContentsExists').returns(Promise.resolve(true));
            // valid ghost property on package
            sandbox.stub(perms, 'getPackageContents').returns(Promise.resolve(validGhostPackageJsonContents));

            perms.read().then(function (readPerms) {
                should.exist(readPerms);

                readPerms.should.not.equal(AppPermissions.DefaultPermissions);

                should.exist(readPerms.posts);
                readPerms.posts.length.should.equal(5);

                should.exist(readPerms.users);
                readPerms.users.length.should.equal(5);

                should.exist(readPerms.settings);
                readPerms.settings.length.should.equal(5);

                _.keys(readPerms).length.should.equal(3);

                done();
            }).catch(done);
        });
    });
});
