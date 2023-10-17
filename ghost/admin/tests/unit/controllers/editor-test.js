import EmberObject from '@ember/object';
import RSVP from 'rsvp';
import {defineProperty} from '@ember/object';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {settled} from '@ember/test-helpers';
import {setupTest} from 'ember-mocha';
import {task} from 'ember-concurrency';

describe('Unit: Controller: lexical-editor', function () {
    setupTest();

    describe('generateSlug', function () {
        it('should generate a slug and set it on the post', async function () {
            let controller = this.owner.lookup('controller:lexical-editor');

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
            let controller = this.owner.lookup('controller:lexical-editor');

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
            this.controller = this.owner.lookup('controller:lexical-editor');
            this.controller.set('target', {send() {}});
        });

        it('should invoke generateSlug if the post has no user custom slug and has not been published', async function () {
            let {controller} = this;

            controller.set('target', {send() {}});
            defineProperty(controller, 'generateSlugTask', task(function * () {
                this.set('post.slug', 'test-slug');
                yield RSVP.resolve();
            }));
            controller.set('post', EmberObject.create({isPublished: false}));
            controller.set('isUserCustomSlug', false);

            expect(controller.get('post.isPublished')).to.be.false;
            expect(controller.get('isUserCustomSlug')).to.be.false;
            expect(controller.get('post.titleScratch')).to.not.be.ok;

            controller.set('post.titleScratch', 'test');
            await controller.saveTitleTask.perform();

            expect(controller.get('post.titleScratch')).to.equal('test');
            expect(controller.get('post.slug')).to.equal('test-slug');
        });

        it('should not invoke generateSlug if the user has input a custom slug', async function () {
            let {controller} = this;

            controller.set('target', {send() {}});
            defineProperty(controller, 'generateSlugTask', task(function * () {
                expect(false, 'generateSlug should not be called').to.equal(true);
                yield RSVP.resolve();
            }));
            controller.set('post', EmberObject.create({
                slug: 'custom-slug',
                title: 'a title'
            }));
            controller.set('isUserCustomSlug', true);

            expect(controller.get('isUserCustomSlug')).to.be.true;
            expect(controller.get('post.slug')).to.equal('custom-slug');
            expect(controller.get('post.title')).to.equal('a title');
            expect(controller.get('post.titleScratch')).to.not.be.ok;

            controller.set('post.titleScratch', 'test');
            await controller.saveTitleTask.perform();

            expect(controller.get('post.titleScratch')).to.equal('test');
            expect(controller.get('post.slug')).to.equal('custom-slug');
        });

        it('should not invoke generateSlug if the post has been published', async function () {
            let {controller} = this;

            controller.set('target', {send() {}});
            defineProperty(controller, 'generateSlugTask', task(function * () {
                expect(false, 'generateSlug should not be called').to.equal(true);
                yield RSVP.resolve();
            }));
            controller.set('post', EmberObject.create({
                isNew: false,
                isPublished: true
            }));

            expect(controller.get('post.isNew')).to.be.false;
            expect(controller.get('post.isPublished')).to.be.true;
            expect(controller.get('post.title')).to.not.be.ok;

            controller.set('post.titleScratch', 'title');
            await controller.saveTitleTask.perform();

            expect(controller.get('post.titleScratch')).to.equal('title');
            expect(controller.get('post.slug')).to.not.be.ok;
        });
    });
});
