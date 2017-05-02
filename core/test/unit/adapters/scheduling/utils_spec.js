var should = require('should'),
    fs = require('fs'),
    config = require(__dirname + '/../../../../server/config'),
    errors = require(config.get('paths').corePath + '/server/errors'),
    schedulingUtils = require(config.get('paths').corePath + '/server/adapters/scheduling/utils');

describe('Scheduling: utils', function () {
    describe('success', function () {
        it('create good adapter', function (done) {
            schedulingUtils.createAdapter({
                active: __dirname + '/../../../../server/adapters/scheduling/SchedulingDefault'
            }).then(function (adapter) {
                should.exist(adapter);
                done();
            }).catch(done);
        });

        it('create good adapter', function (done) {
            var jsFile = '' +
                'var util = require(\'util\');' +
                'var SchedulingBase = require(__dirname + \'/../../../../server/adapters/scheduling/SchedulingBase\');' +
                'var AnotherAdapter = function (){ SchedulingBase.call(this); };' +
                'util.inherits(AnotherAdapter, SchedulingBase);' +
                'AnotherAdapter.prototype.run = function (){};' +
                'AnotherAdapter.prototype.schedule = function (){};' +
                'AnotherAdapter.prototype.reschedule = function (){};' +
                'AnotherAdapter.prototype.unschedule = function (){};' +
                'module.exports = AnotherAdapter';

            fs.writeFileSync(__dirname + '/another-scheduler.js', jsFile);

            schedulingUtils.createAdapter({
                active: 'another-scheduler',
                contentPath: __dirname + '/'
            }).then(function (adapter) {
                should.exist(adapter);
                done();
            }).finally(function () {
                fs.unlinkSync(__dirname + '/another-scheduler.js');
            }).catch(done);
        });
    });

    describe('error', function () {
        it('create without adapter path', function (done) {
            schedulingUtils.createAdapter()
                .catch(function (err) {
                    should.exist(err);
                    done();
                });
        });

        it('create with unknown adapter', function (done) {
            schedulingUtils.createAdapter({
                active: '/follow/the/heart'
            }).catch(function (err) {
                should.exist(err);
                done();
            });
        });

        it('create with adapter, but missing fn\'s', function (done) {
            var jsFile = '' +
                'var util = require(\'util\');' +
                'var SchedulingBase = require(__dirname + \'/../../../../server/adapters/scheduling/SchedulingBase\');' +
                'var BadAdapter = function (){ SchedulingBase.call(this); };' +
                'util.inherits(BadAdapter, SchedulingBase);' +
                'BadAdapter.prototype.schedule = function (){};' +
                'module.exports = BadAdapter';

            fs.writeFileSync(__dirname + '/bad-adapter.js', jsFile);

            schedulingUtils.createAdapter({
                active: __dirname + '/bad-adapter'
            }).catch(function (err) {
                should.exist(err);
                (err instanceof errors.IncorrectUsageError).should.eql(true);
                done();
            }).finally(function () {
                fs.unlinkSync(__dirname + '/bad-adapter.js');
            });
        });
    });
});
