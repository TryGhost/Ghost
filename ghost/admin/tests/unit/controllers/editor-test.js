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

    describe('TK count in title', function () {
        it('should have count 0 for no TK', async function () {
            let controller = this.owner.lookup('controller:lexical-editor');

            controller.set('post', EmberObject.create({titleScratch: 'this is a title'}));

            expect(controller.get('tkCount')).to.equal(0);
        });

        it('should count TK reminders in the title', async function () {
            let controller = this.owner.lookup('controller:lexical-editor');

            controller.set('post', EmberObject.create({titleScratch: 'this is a TK'}));

            expect(controller.get('tkCount')).to.equal(1);
        });
    });

    describe('hasDirtyAttributes', function () {
        it('Changes in the direction field in the lexical string are not considered dirty', async function () {
            let controller = this.owner.lookup('controller:lexical-editor');

            const initialLexicalString = `{"root":{"children":[{"children": [{"detail": 0,"format": 0,"mode": "normal","style": "","text": "Sample content","type": "extended-text","version": 1}],"direction": null,"format": "","indent": 0,"type": "paragraph","version": 1}],"direction": "ltr","format": "","indent": 0,"type": "root","version": 1}}`;
            const lexicalStringNoNullDirection = `{"root":{"children":[{"children": [{"detail": 0,"format": 0,"mode": "normal","style": "","text": "Sample content","type": "extended-text","version": 1}],"direction": "ltr","format": "","indent": 0,"type": "paragraph","version": 1}],"direction": "ltr","format": "","indent": 0,"type": "root","version": 1}}`;
            const lexicalStringUpdatedContent = `{"root":{"children":[{"children": [{"detail": 0,"format": 0,"mode": "normal","style": "","text": "Here's some new text","type": "extended-text","version": 1}],"direction": "ltr","format": "","indent": 0,"type": "paragraph","version": 1}],"direction": "ltr","format": "","indent": 0,"type": "root","version": 1}}`;

            // we can't seem to call setPost directly, so we have to set the post manually
            controller.set('post', EmberObject.create({
                title: 'this is a title',
                titleScratch: 'this is a title',
                status: 'published',
                lexical: initialLexicalString,
                lexicalScratch: initialLexicalString
            }));

            // synthetically update the lexicalScratch as if the editor itself made the modifications on loading the initial editorState
            controller.send('updateScratch',JSON.parse(lexicalStringNoNullDirection));

            // this should NOT result in the post being dirty - while lexical !== lexicalScratch, we ignore the direction field
            let isDirty = controller.get('hasDirtyAttributes');
            expect(isDirty).to.be.false;

            // now we try a synthetic change in the actual text content that should result in a dirty post
            controller.send('updateScratch',JSON.parse(lexicalStringUpdatedContent));

            // this should NOT result in the post being dirty - while lexical !== lexicalScratch, we ignore the direction field
            isDirty = controller.get('hasDirtyAttributes');
            expect(isDirty).to.be.true;
        });
    });
});
