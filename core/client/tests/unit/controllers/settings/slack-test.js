// /* jshint expr:true */
// import { expect, assert } from 'chai';
// import { describeModule, it } from 'ember-mocha';
// import Ember from 'ember';
// import SlackObject from 'ghost/models/slack-integration';
//
// const {run} = Ember;
//
// describeModule(
//     'controller:settings/apps/slack',
//     'Unit: Controller: settings/apps/slack',
//     {
//         // Specify the other units that are required for this test.
//         needs: ['service:ghostPaths', 'service:notifications', 'service:ajax', 'model:slack-integration']
//     },
//     function () {
//         it('url is one-way bound to model.slack', function () {
//             let controller = this.subject({
//                 model: Ember.Object.create({
//                     url: 'http://myblog.com/mypost'
//                 })
//             });
//
//             expect(controller.get('settings.slack')).to.equal('http://myblog.com/mypost');
//             expect(controller.get('_scratchValues.url')).to.equal('http://myblog.com/mypost');
//
//             run(function () {
//                 controller.set('model.slack', 'http://myblog.com/newpost');
//
//                 expect(controller.get('_scratchValues.url')).to.equal('http://myblog.com/newpost');
//             });
//
//             run(function () {
//                 controller.set('_scratchValues.url', 'changed-directly');
//
//                 expect(controller.get('model.slack')).to.equal('changed-slug');
//                 expect(controller.get('_scratchValues.url')).to.equal('changed-directly');
//             });
//
//             run(function () {
//                 // test that the one-way binding is still in place
//                 controller.set('model.slack', 'should-update');
//
//                 expect(controller.get('_scratchValues.url')).to.equal('should-update');
//             });
//         });
//     }
// );
