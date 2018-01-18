import EmberObject from '@ember/object';
import RSVP from 'rsvp';
import wait from 'ember-test-helpers/wait';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {run} from '@ember/runloop';
import {setupTest} from 'ember-mocha';
import {task} from 'ember-concurrency';

describe('Unit: Controller: editor', function () {
    setupTest('controller:editor', {
        needs: [
            'controller:application',
            'service:feature',
            'service:notifications',
            // 'service:router',
            'service:slugGenerator',
            'service:ui'
        ]
    });

    describe('generateSlug', function () {
        it('should generate a slug and set it on the post', function (done) {
            run(() => {
                let controller = this.subject();

                controller.set('slugGenerator', EmberObject.create({
                    generateSlug(slugType, str) {
                        return RSVP.resolve(`${str}-slug`);
                    }
                }));
                controller.set('post', EmberObject.create({slug: ''}));

                controller.set('post.titleScratch', 'title');

                expect(controller.get('post.slug')).to.equal('');

                run(() => {
                    controller.get('generateSlug').perform();
                });

                wait().then(() => {
                    expect(controller.get('post.slug')).to.equal('title-slug');
                    done();
                });
            });
        });

        it('should not set the destination if the title is "(Untitled)" and the post already has a slug', function (done) {
            let controller = this.subject();

            run(() => {
                controller.set('slugGenerator', EmberObject.create({
                    generateSlug(slugType, str) {
                        return RSVP.resolve(`${str}-slug`);
                    }
                }));
                controller.set('post', EmberObject.create({slug: 'whatever'}));
            });

            expect(controller.get('post.slug')).to.equal('whatever');

            controller.set('post.titleScratch', '(Untitled)');

            run(() => {
                controller.get('generateSlug').perform();
            });

            wait().then(() => {
                expect(controller.get('post.slug')).to.equal('whatever');
                done();
            });
        });
    });

    describe('saveTitle', function () {
        it('should invoke generateSlug if the post is new and a title has not been set', function (done) {
            let controller = this.subject();

            run(() => {
                controller.set('generateSlug', task(function * () {
                    this.set('post.slug', 'test-slug');
                    yield RSVP.resolve();
                }));
                controller.set('post', EmberObject.create({isNew: true}));
            });

            expect(controller.get('post.isNew')).to.be.true;
            expect(controller.get('post.titleScratch')).to.not.be.ok;

            controller.set('post.titleScratch', 'test');

            run(() => {
                controller.get('saveTitle').perform();
            });

            wait().then(() => {
                expect(controller.get('post.titleScratch')).to.equal('test');
                expect(controller.get('post.slug')).to.equal('test-slug');
                done();
            });
        });

        it('should invoke generateSlug if the post is not new and it\'s title is "(Untitled)"', function (done) {
            let controller = this.subject();

            run(() => {
                controller.set('generateSlug', task(function * () {
                    this.set('post.slug', 'test-slug');
                    yield RSVP.resolve();
                }));
                controller.set('post', EmberObject.create({isNew: false, title: '(Untitled)'}));
            });

            expect(controller.get('post.isNew')).to.be.false;
            expect(controller.get('post.titleScratch')).to.not.be.ok;

            controller.set('post.titleScratch', 'New Title');

            run(() => {
                controller.get('saveTitle').perform();
            });

            wait().then(() => {
                expect(controller.get('post.titleScratch')).to.equal('New Title');
                expect(controller.get('post.slug')).to.equal('test-slug');
                done();
            });
        });

        it('should not invoke generateSlug if the post is new but has a title', function (done) {
            let controller = this.subject();

            run(() => {
                controller.set('generateSlug', task(function * () {
                    expect(false, 'generateSlug should not be called').to.equal(true);
                    yield RSVP.resolve();
                }));
                controller.set('post', EmberObject.create({
                    isNew: true,
                    title: 'a title'
                }));
            });

            expect(controller.get('post.isNew')).to.be.true;
            expect(controller.get('post.title')).to.equal('a title');
            expect(controller.get('post.titleScratch')).to.not.be.ok;

            controller.set('post.titleScratch', 'test');

            run(() => {
                controller.get('saveTitle').perform();
            });

            wait().then(() => {
                expect(controller.get('post.titleScratch')).to.equal('test');
                expect(controller.get('post.slug')).to.not.be.ok;
                done();
            });
        });

        it('should not invoke generateSlug if the post is not new and the title is not "(Untitled)"', function (done) {
            let controller = this.subject();

            run(() => {
                controller.set('generateSlug', task(function * () {
                    expect(false, 'generateSlug should not be called').to.equal(true);
                    yield RSVP.resolve();
                }));
                controller.set('post', EmberObject.create({isNew: false}));
            });

            expect(controller.get('post.isNew')).to.be.false;
            expect(controller.get('post.title')).to.not.be.ok;

            controller.set('post.titleScratch', 'title');

            run(() => {
                controller.get('saveTitle').perform();
            });

            wait().then(() => {
                expect(controller.get('post.titleScratch')).to.equal('title');
                expect(controller.get('post.slug')).to.not.be.ok;
                done();
            });
        });
    });
});
