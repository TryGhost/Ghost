
var should = require('should'),
    fs = require('fs'),
    config = require(__dirname + '/../../../server/config'),
    errors = require(config.get('paths').corePath + '/server/errors'),
    schedulingUtils = require(config.get('paths').corePath + '/server/scheduling/utils');

describe('Scheduling: utils', function () {
    describe('success', function () {
        it('create good adapter', function () {
            return schedulingUtils.createAdapter({
                active: __dirname + '/../../../server/scheduling/SchedulingDefault'
            }).then(function (adapter) {
                should.exist(adapter);
            });
        });

        it('create good adapter', function () {
            var jsFile = '' +
                'var util = require(\'util\');' +
                'var SchedulingBase = require(__dirname + \'/../../../server/scheduling/SchedulingBase\');' +
                'var AnotherAdapter = function (){ SchedulingBase.call(this); };' +
                'util.inherits(AnotherAdapter, SchedulingBase);' +
                'AnotherAdapter.prototype.run = function (){};' +
                'AnotherAdapter.prototype.schedule = function (){};' +
                'AnotherAdapter.prototype.reschedule = function (){};' +
                'AnotherAdapter.prototype.unschedule = function (){};' +
                'module.exports = AnotherAdapter';

            fs.writeFileSync(__dirname + '/another-scheduler.js', jsFile);

            return schedulingUtils.createAdapter({
                active: 'another-scheduler',
                contentPath: __dirname + '/'
            }).then(function (adapter) {
                should.exist(adapter);
            }).finally(function () {
                fs.unlinkSync(__dirname + '/another-scheduler.js');
            });
        });
    });

    describe('error', function () {
        it('create without adapter path', function () {
            return schedulingUtils.createAdapter().catch(function (err) {
                should.exist(err);
            });
        });

        it('create with unknown adapter', function () {
            return schedulingUtils.createAdapter({
                active: '/follow/the/heart'
            }).catch(function (err) {
                should.exist(err);
            });
        });

        it('create with adapter, but missing fn\'s', function () {
            var jsFile = '' +
                'var util = require(\'util\');' +
                'var SchedulingBase = require(__dirname + \'/../../../server/scheduling/SchedulingBase\');' +
                'var BadAdapter = function (){ SchedulingBase.call(this); };' +
                'util.inherits(BadAdapter, SchedulingBase);' +
                'BadAdapter.prototype.schedule = function (){};' +
                'module.exports = BadAdapter';

            fs.writeFileSync(__dirname + '/bad-adapter.js', jsFile);

            return schedulingUtils.createAdapter({
                active: __dirname + '/bad-adapter'
            }).catch(function (err) {
                should.exist(err);
                (err instanceof errors.IncorrectUsageError).should.eql(true);
            }).finally(function () {
                fs.unlinkSync(__dirname + '/bad-adapter.js');
            });
        });
    });
});
