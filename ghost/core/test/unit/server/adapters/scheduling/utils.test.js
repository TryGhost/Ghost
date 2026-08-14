const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');
const fs = require('fs-extra');
const configUtils = require('../../../../utils/config-utils');
const adapterManager = require('../../../../../core/server/services/adapter-manager').default;

const schedulingPath = configUtils.config.getContentPath('adapters') + 'scheduling/';
describe('Scheduling: utils', function () {
    const scope = {adapter: null};

    beforeAll(function () {
        if (!fs.existsSync(schedulingPath)) {
            fs.mkdirSync(schedulingPath);
        }
    });

    afterEach(async function () {
        if (scope.adapter) {
            fs.unlinkSync(scope.adapter);
            scope.adapter = null;
        }

        await configUtils.restore();
    });

    describe('success', function () {
        it('create good adapter', function () {
            const adapter = adapterManager.getAdapter('scheduling');
            assertExists(adapter);
        });

        it('create good adapter from custom file', function () {
            scope.adapter = schedulingPath + 'another-scheduler.js';

            configUtils.set({
                scheduling: {
                    active: 'another-scheduler'
                }
            });

            const jsFile = `
                const {SchedulingBase} = require('@tryghost/adapter-base-scheduling');

                module.exports = class AnotherAdapter extends SchedulingBase {
                    constructor() {
                        super();
                    }

                    run() {}
                    schedule() {}
                    unschedule() {}
                }
            `

            fs.writeFileSync(scope.adapter, jsFile);

            const adapter = adapterManager.getAdapter('scheduling');
            assertExists(adapter);
        });
    });

    describe('error', function () {
        it('create with adapter, but missing fn\'s', function () {
            scope.adapter = schedulingPath + 'bad-adapter.js';
            const jsFile = `
                const {SchedulingBase} = require('@tryghost/adapter-base-scheduling');
                module.exports = class BadAdapter extends SchedulingBase {
                  schedule() {}
                }
            `

            fs.writeFileSync(scope.adapter, jsFile);

            configUtils.set({
                scheduling: {
                    active: 'bad-adapter'
                }
            });

            assert.throws(
                () => adapterManager.getAdapter('scheduling'),
                (err) => {
                    assertExists(err);
                    assert.equal(err.errorType, 'IncorrectUsageError');
                    return true;
                }
            );
        });
    });
});
