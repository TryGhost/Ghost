/* jshint expr:true */
import { expect, assert } from 'chai';
import { describeModule, it } from 'ember-mocha';
import Ember from 'ember';
import { NavItem } from 'ghost/controllers/settings/navigation';

const {run} = Ember;

const navSettingJSON = `[
    {"label":"Home","url":"/"},
    {"label":"JS Test","url":"javascript:alert('hello');"},
    {"label":"About","url":"/about"},
    {"label":"Sub Folder","url":"/blah/blah"},
    {"label":"Telephone","url":"tel:01234-567890"},
    {"label":"Mailto","url":"mailto:test@example.com"},
    {"label":"External","url":"https://example.com/testing?query=test#anchor"},
    {"label":"No Protocol","url":"//example.com"}
]`;

describeModule(
    'controller:settings/navigation',
    'Unit: Controller: settings/navigation',
    {
        // Specify the other units that are required for this test.
        needs: ['service:config', 'service:notifications']
    },
    function () {
        it('blogUrl: captures config and ensures trailing slash', function () {
            let ctrl = this.subject();
            ctrl.set('config.blogUrl', 'http://localhost:2368/blog');
            expect(ctrl.get('blogUrl')).to.equal('http://localhost:2368/blog/');
        });

        it('navigationItems: generates list of NavItems', function () {
            let ctrl = this.subject();
            let lastItem;

            run(() => {
                ctrl.set('model', Ember.Object.create({navigation: navSettingJSON}));
                expect(ctrl.get('navigationItems.length')).to.equal(9);
                expect(ctrl.get('navigationItems.firstObject.label')).to.equal('Home');
                expect(ctrl.get('navigationItems.firstObject.url')).to.equal('/');
                expect(ctrl.get('navigationItems.firstObject.last')).to.be.false;

                // adds a blank item as last one is complete
                lastItem = ctrl.get('navigationItems.lastObject');
                expect(lastItem.get('label')).to.equal('');
                expect(lastItem.get('url')).to.equal('');
                expect(lastItem.get('last')).to.be.true;
            });
        });

        it('navigationItems: adds blank item if navigation setting is empty', function () {
            let ctrl = this.subject();
            let lastItem;

            run(() => {
                ctrl.set('model', Ember.Object.create({navigation: null}));
                expect(ctrl.get('navigationItems.length')).to.equal(1);

                lastItem = ctrl.get('navigationItems.lastObject');
                expect(lastItem.get('label')).to.equal('');
                expect(lastItem.get('url')).to.equal('');
            });
        });

        it('updateLastNavItem: correctly sets "last" properties', function () {
            let ctrl = this.subject();
            let item1,
                item2;

            run(() => {
                ctrl.set('model', Ember.Object.create({navigation: navSettingJSON}));

                item1 = ctrl.get('navigationItems.lastObject');
                expect(item1.get('last')).to.be.true;

                ctrl.get('navigationItems').addObject(Ember.Object.create({label: 'Test', url: '/test'}));

                item2 = ctrl.get('navigationItems.lastObject');
                expect(item2.get('last')).to.be.true;
                expect(item1.get('last')).to.be.false;
            });
        });

        it('save: validates nav items', function (done) {
            let ctrl = this.subject();

            run(() => {
                ctrl.set('model', Ember.Object.create({navigation: `[
                    {"label":"First",   "url":"/"},
                    {"label":"",        "url":"/second"},
                    {"label":"Third",   "url":""}
                ]`}));
                // blank item won't get added because the last item is incomplete
                expect(ctrl.get('navigationItems.length')).to.equal(3);

                ctrl.save().then(function passedValidation() {
                    assert(false, 'navigationItems weren\'t validated on save');
                    done();
                }).catch(function failedValidation() {
                    let navItems = ctrl.get('navigationItems');
                    expect(navItems[0].get('errors').toArray()).to.be.empty;
                    expect(navItems[1].get('errors.firstObject.attribute')).to.equal('label');
                    expect(navItems[2].get('errors.firstObject.attribute')).to.equal('url');
                    done();
                });
            });
        });

        it('save: generates new navigation JSON', function (done) {
            let ctrl = this.subject();
            let model = Ember.Object.create({navigation: {}});
            let expectedJSON = `[{"label":"New","url":"/new"}]`;

            model.save = function () {
                return new Ember.RSVP.Promise((resolve, reject) => {
                    return resolve(this);
                });
            };

            run(() => {
                ctrl.set('model', model);

                // remove inserted blank item so validation works
                ctrl.get('navigationItems').removeObject(ctrl.get('navigationItems.firstObject'));
                // add new object
                ctrl.get('navigationItems').addObject(NavItem.create({label: 'New', url: '/new'}));

                ctrl.save().then(function success() {
                    expect(ctrl.get('model.navigation')).to.equal(expectedJSON);
                    done();
                }, function failure() {
                    assert(false, 'save failed with valid data');
                    done();
                });
            });
        });

        it('action - addItem: adds item to navigationItems', function () {
            let ctrl = this.subject();

            run(() => {
                ctrl.set('navigationItems', [NavItem.create({label: 'First', url: '/first', last: true})]);
                expect(ctrl.get('navigationItems.length')).to.equal(1);
                ctrl.send('addItem');
                expect(ctrl.get('navigationItems.length')).to.equal(2);
                expect(ctrl.get('navigationItems.firstObject.last')).to.be.false;
                expect(ctrl.get('navigationItems.lastObject.label')).to.equal('');
                expect(ctrl.get('navigationItems.lastObject.url')).to.equal('');
                expect(ctrl.get('navigationItems.lastObject.last')).to.be.true;
            });
        });

        it('action - addItem: doesn\'t insert new item if last object is incomplete', function () {
            let ctrl = this.subject();

            run(() => {
                ctrl.set('navigationItems', [NavItem.create({label: '', url: '', last: true})]);
                expect(ctrl.get('navigationItems.length')).to.equal(1);
                ctrl.send('addItem');
                expect(ctrl.get('navigationItems.length')).to.equal(1);
            });
        });

        it('action - deleteItem: removes item from navigationItems', function () {
            let ctrl = this.subject();
            let navItems = [
                NavItem.create({label: 'First', url: '/first'}),
                NavItem.create({label: 'Second', url: '/second', last: true})
            ];

            run(() => {
                ctrl.set('navigationItems', navItems);
                expect(ctrl.get('navigationItems').mapBy('label')).to.deep.equal(['First', 'Second']);
                ctrl.send('deleteItem', ctrl.get('navigationItems.firstObject'));
                expect(ctrl.get('navigationItems').mapBy('label')).to.deep.equal(['Second']);
            });
        });

        it('action - moveItem: updates navigationItems list', function () {
            let ctrl = this.subject();
            let navItems = [
                NavItem.create({label: 'First', url: '/first'}),
                NavItem.create({label: 'Second', url: '/second', last: true})
            ];

            run(() => {
                ctrl.set('navigationItems', navItems);
                expect(ctrl.get('navigationItems').mapBy('label')).to.deep.equal(['First', 'Second']);
                ctrl.send('moveItem', 1, 0);
                expect(ctrl.get('navigationItems').mapBy('label')).to.deep.equal(['Second', 'First']);
            });
        });

        it('action - updateUrl: updates URL on navigationItem', function () {
            let ctrl = this.subject();
            let navItems = [
                NavItem.create({label: 'First', url: '/first'}),
                NavItem.create({label: 'Second', url: '/second', last: true})
            ];

            run(() => {
                ctrl.set('navigationItems', navItems);
                expect(ctrl.get('navigationItems').mapBy('url')).to.deep.equal(['/first', '/second']);
                ctrl.send('updateUrl', '/new', ctrl.get('navigationItems.firstObject'));
                expect(ctrl.get('navigationItems').mapBy('url')).to.deep.equal(['/new', '/second']);
            });
        });
    }
);
