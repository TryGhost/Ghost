/*globals describe, beforeEach, afterEach, it*/
var EventEmitter = require('events').EventEmitter,
    /*jshint unused:false*/
    should       = require('should'),
    sinon        = require('sinon'),
    _            = require('lodash'),
    i18n         = require('../../../server/i18n'),

    // Stuff we are testing
    AppDependencies = require('../../../server/apps/dependencies');

i18n.init();

describe('Apps: Dependencies', function () {
    var sandbox,
        fakeApi;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();

        fakeApi = {
            posts: {
                browse: sandbox.stub(),
                read: sandbox.stub(),
                edit: sandbox.stub(),
                add: sandbox.stub(),
                destroy: sandbox.stub()
            },
            users: {
                browse: sandbox.stub(),
                read: sandbox.stub(),
                edit: sandbox.stub()
            },
            tags: {
                all: sandbox.stub()
            },
            notifications: {
                destroy: sandbox.stub(),
                add: sandbox.stub()
            },
            settings: {
                browse: sandbox.stub(),
                read: sandbox.stub(),
                add: sandbox.stub()
            }
        };
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('Dependencies', function () {
        it('can install by package.json', function (done) {
            var deps = new AppDependencies(process.cwd()),
                fakeEmitter = new EventEmitter();

            deps.spawnCommand = sandbox.stub().returns(fakeEmitter);

            deps.install().then(function () {
                deps.spawnCommand.calledWith('npm').should.equal(true);
                done();
            }).catch(done);

            _.delay(function () {
                fakeEmitter.emit('exit');
            }, 30);
        });
        it('does not install when no package.json', function (done) {
            var deps = new AppDependencies(__dirname),
                fakeEmitter = new EventEmitter();

            deps.spawnCommand = sandbox.stub().returns(fakeEmitter);

            deps.install().then(function () {
                deps.spawnCommand.called.should.equal(false);
                done();
            }).catch(done);

            _.defer(function () {
                fakeEmitter.emit('exit');
            });
        });
    });
});
