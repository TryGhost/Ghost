import Ember from 'ember';
import {
    describeModule,
    it
} from 'ember-mocha';

const {run} = Ember;

describeModule(
    'controller:settings/general',
    'Unit: Controller: settings/general',
    {
        needs: ['service:notifications']
    },

    function () {
        it('isDatedPermalinks should be correct', function () {
            const controller = this.subject({
                model: Ember.Object.create({
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
            const controller = this.subject({
                model: Ember.Object.create({
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

        it('themes should be correct', function () {
            let themes = [];
            let controller;

            themes.push({
                name: 'casper',
                active: true,
                package: {
                    name: 'Casper',
                    version: '1.1.5'
                }
            });

            themes.push({
                name: 'rasper',
                package: {
                    name: 'Rasper',
                    version: '1.0.0'
                }
            });

            controller = this.subject({
                model: Ember.Object.create({
                    availableThemes: themes
                })
            });

            themes = controller.get('themes');
            expect(themes).to.be.an.Array;
            expect(themes.length).to.equal(2);
            expect(themes.objectAt(0).name).to.equal('casper');
            expect(themes.objectAt(0).active).to.be.ok;
            expect(themes.objectAt(0).label).to.equal('Casper - 1.1.5');
            expect(themes.objectAt(1).name).to.equal('rasper');
            expect(themes.objectAt(1).active).to.not.be.ok;
            expect(themes.objectAt(1).label).to.equal('Rasper - 1.0.0');
        });
    }
);
