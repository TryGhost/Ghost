var should = require('should'), // jshint ignore:line
    sinon = require('sinon'),
    EventEmitter = require('events').EventEmitter,
    _ = require('lodash'),

    // Stuff we are testing
    AppDependencies = require('../../../../server/services/apps/dependencies'),

    sandbox = sinon.sandbox.create();

describe('Apps', function () {
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
