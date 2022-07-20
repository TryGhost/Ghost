const should = require('should');
const fs = require('fs-extra');
const configUtils = require('../../../../utils/configUtils');
const config = require('../../../../../core/shared/config');
const schedulingUtils = require('../../../../../core/server/adapters/scheduling/utils');

const schedulingPath = configUtils.config.getContentPath('adapters') + 'scheduling/';
describe('Scheduling: utils', function () {
    const scope = {adapter: null};

    before(function () {
        if (!fs.existsSync(schedulingPath)) {
            fs.mkdirSync(schedulingPath);
        }
    });

    afterEach(function () {
        if (scope.adapter) {
            fs.unlinkSync(scope.adapter);
            scope.adapter = null;
        }

        configUtils.restore();
    });

    describe('success', function () {
        it('create good adapter', function (done) {
            schedulingUtils.createAdapter().then(function (adapter) {
                should.exist(adapter);
                done();
            }).catch(done);
        });

        it('create good adapter', function (done) {
            scope.adapter = schedulingPath + 'another-scheduler.js';

            configUtils.set({
                scheduling: {
                    active: 'another-scheduler'
                }
            });

            const jsFile = '' +
                'var util = require(\'util\');' +
                'var SchedulingBase = require(\'../../../core/server/adapters/scheduling/SchedulingBase\');' +
                'var AnotherAdapter = function (){ SchedulingBase.call(this); };' +
                'util.inherits(AnotherAdapter, SchedulingBase);' +
                'AnotherAdapter.prototype.run = function (){};' +
                'AnotherAdapter.prototype.schedule = function (){};' +
                'AnotherAdapter.prototype.reschedule = function (){};' +
                'AnotherAdapter.prototype.unschedule = function (){};' +
                'module.exports = AnotherAdapter';

            fs.writeFileSync(scope.adapter, jsFile);

            schedulingUtils.createAdapter().then(function (adapter) {
                should.exist(adapter);
                done();
            }).catch(done);
        });
    });

    describe('error', function () {
        it('create with adapter, but missing fn\'s', function (done) {
            scope.adapter = schedulingPath + 'bad-adapter.js';
            const jsFile = '' +
                'var util = require(\'util\');' +
                'var SchedulingBase = require(\'../../../core/server/adapters/scheduling/SchedulingBase\');' +
                'var BadAdapter = function (){ SchedulingBase.call(this); };' +
                'util.inherits(BadAdapter, SchedulingBase);' +
                'BadAdapter.prototype.schedule = function (){};' +
                'module.exports = BadAdapter';

            fs.writeFileSync(scope.adapter, jsFile);

            configUtils.set({
                scheduling: {
                    active: 'bad-adapter'
                }
            });
            schedulingUtils.createAdapter().catch(function (err) {
                should.exist(err);
                should.equal(err.errorType, 'IncorrectUsageError');
                done();
            });
        });
    });
});
