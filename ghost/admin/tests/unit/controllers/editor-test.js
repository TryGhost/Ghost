import EmberObject from '@ember/object';
import RSVP from 'rsvp';
import {defineProperty} from '@ember/object';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {settled} from '@ember/test-helpers';
import {setupTest} from 'ember-mocha';
import {task} from 'ember-concurrency';

describe('Unit: Controller: editor', function () {
    setupTest();

    describe('generateSlug', function () {
        it('should generate a slug and set it on the post', async function () {
            let controller = this.owner.lookup('controller:editor');

            controller.set('slugGenerator', EmberObject.create({
                generateSlug(slugType, str) {
                    return RSVP.resolve(`${str}-slug`);
                }
            }));
            controller.set('post', EmberObject.create({slug: ''}));

            controller.set('post.titleScratch', 'title');
            await settled();

            expect(controller.get('post.slug')).to.equal('');

            await controller.generateSlugTask.perform();

            expect(controller.get('post.slug')).to.equal('title-slug');
        });

        it('should not set the destination if the title is "(Untitled)" and the post already has a slug', async function () {
            let controller = this.owner.lookup('controller:editor');

            controller.set('slugGenerator', EmberObject.create({
                generateSlug(slugType, str) {
                    return RSVP.resolve(`${str}-slug`);
                }
            }));
            controller.set('post', EmberObject.create({slug: 'whatever'}));

            expect(controller.get('post.slug')).to.equal('whatever');

            controller.set('post.titleScratch', '(Untitled)');
            await controller.generateSlugTask.perform();

            expect(controller.get('post.slug')).to.equal('whatever');
        });
    });

    describe('saveTitleTask', function () {
        beforeEach(function () {
            this.controller = this.owner.lookup('controller:editor');
            this.controller.set('target', {send() {}});
        });

        it('should invoke generateSlug if the post is new and a title has not been set', async function () {
            let {controller} = this;

            controller.set('target', {send() {}});
            defineProperty(controller, 'generateSlugTask', task(function * () {
                this.set('post.slug', 'test-slug');
                yield RSVP.resolve();
            }));
            controller.set('post', EmberObject.create({isNew: true}));

            expect(controller.get('post.isNew')).to.be.true;
            expect(controller.get('post.titleScratch')).to.not.be.ok;

            controller.set('post.titleScratch', 'test');
            await controller.saveTitleTask.perform();

            expect(controller.get('post.titleScratch')).to.equal('test');
            expect(controller.get('post.slug')).to.equal('test-slug');
        });

        it('should invoke generateSlug if the post is not new and it\'s title is "(Untitled)"', async function () {
            let {controller} = this;

            controller.set('target', {send() {}});
            defineProperty(controller, 'generateSlugTask', task(function * () {
                this.set('post.slug', 'test-slug');
                yield RSVP.resolve();
            }));
            controller.set('post', EmberObject.create({isNew: false, title: '(Untitled)'}));

            expect(controller.get('post.isNew')).to.be.false;
            expect(controller.get('post.titleScratch')).to.not.be.ok;

            controller.set('post.titleScratch', 'New Title');

            await controller.saveTitleTask.perform();

            expect(controller.get('post.titleScratch')).to.equal('New Title');
            expect(controller.get('post.slug')).to.equal('test-slug');
        });

        it('should invoke generateSlug if the post is a duplicated post', async function () {
            let {controller} = this;

            controller.set('target', {send() {}});
            defineProperty(controller, 'generateSlugTask', task(function * () {
                this.set('post.slug', 'test-slug');
                yield RSVP.resolve();
            }));
            controller.set('post', EmberObject.create({isNew: false, title: 'Some Title (Copy)'}));

            expect(controller.get('post.isNew')).to.be.false;
            expect(controller.get('post.titleScratch')).to.not.be.ok;

            controller.set('post.titleScratch', 'Some Title');

            await controller.saveTitleTask.perform();

            expect(controller.get('post.titleScratch')).to.equal('Some Title');
            expect(controller.get('post.slug')).to.equal('test-slug');
        });

        it('should not invoke generateSlug if the post is new but has a title', async function () {
            let {controller} = this;

            controller.set('target', {send() {}});
            defineProperty(controller, 'generateSlugTask', task(function * () {
                expect(false, 'generateSlug should not be called').to.equal(true);
                yield RSVP.resolve();
            }));
            controller.set('post', EmberObject.create({
                isNew: true,
                title: 'a title'
            }));

            expect(controller.get('post.isNew')).to.be.true;
            expect(controller.get('post.title')).to.equal('a title');
            expect(controller.get('post.titleScratch')).to.not.be.ok;

            controller.set('post.titleScratch', 'test');
            await controller.saveTitleTask.perform();

            expect(controller.get('post.titleScratch')).to.equal('test');
            expect(controller.get('post.slug')).to.not.be.ok;
        });

        it('should not invoke generateSlug if the post is not new and the title is not "(Untitled)"', async function () {
            let {controller} = this;

            controller.set('target', {send() {}});
            defineProperty(controller, 'generateSlugTask', task(function * () {
                expect(false, 'generateSlug should not be called').to.equal(true);
                yield RSVP.resolve();
            }));
            controller.set('post', EmberObject.create({isNew: false}));

            expect(controller.get('post.isNew')).to.be.false;
            expect(controller.get('post.title')).to.not.be.ok;

            controller.set('post.titleScratch', 'title');
            await controller.saveTitleTask.perform();

            expect(controller.get('post.titleScratch')).to.equal('title');
            expect(controller.get('post.slug')).to.not.be.ok;
        });
    });
});
