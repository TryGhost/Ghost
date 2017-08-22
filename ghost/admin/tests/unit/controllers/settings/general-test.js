import EmberObject from '@ember/object';
import {describe, it} from 'mocha';
import {run} from '@ember/runloop';
import {setupTest} from 'ember-mocha';

describe('Unit: Controller: settings/general', function () {
    setupTest('controller:settings/general', {
        needs: [
            'service:config',
            'service:ghostPaths',
            'service:notifications',
            'service:session'
        ]
    });

    it('isDatedPermalinks should be correct', function () {
        let controller = this.subject({
            model: EmberObject.create({
                permalinks: '/:year/:month/:day/:slug/'
            })
        });

        expect(controller.get('isDatedPermalinks')).to.be.ok;

        run(function () {
            controller.set('model.permalinks', '/:slug/');

            expect(controller.get('isDatedPermalinks')).to.not.be.ok;
        });
    });

    it('setting isDatedPermalinks should switch between dated and slug', function () {
        let controller = this.subject({
            model: EmberObject.create({
                permalinks: '/:year/:month/:day/:slug/'
            })
        });

        run(function () {
            controller.set('isDatedPermalinks', false);

            expect(controller.get('isDatedPermalinks')).to.not.be.ok;
            expect(controller.get('model.permalinks')).to.equal('/:slug/');
        });

        run(function () {
            controller.set('isDatedPermalinks', true);

            expect(controller.get('isDatedPermalinks')).to.be.ok;
            expect(controller.get('model.permalinks')).to.equal('/:year/:month/:day/:slug/');
        });
    });
});
