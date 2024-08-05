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

        it('should generate a new slug if the previous title was (Untitled)', async function () {
            let controller = this.owner.lookup('controller:lexical-editor');
            controller.set('slugGenerator', EmberObject.create({
                generateSlug(slugType, str) {
                    return RSVP.resolve(`${str}-slug`);
                }
            }));
            controller.set('post', EmberObject.create({
                slug: '',
                title: '(Untitled)',
                titleScratch: 'title'
            }));

            await controller.generateSlugTask.perform();

            expect(controller.get('post.slug')).to.equal('title-slug');
        });

        it('should generate a new slug if the previous title ended with (Copy)', async function () {
            let controller = this.owner.lookup('controller:lexical-editor');
            controller.set('slugGenerator', EmberObject.create({
                generateSlug(slugType, str) {
                    return RSVP.resolve(`${str}-slug`);
                }
            }));

            controller.set('post', EmberObject.create({
                slug: '',
                title: 'title (Copy)',
                titleScratch: 'newTitle'
            }));

            await controller.generateSlugTask.perform();

            expect(controller.get('post.slug')).to.equal('newTitle-slug');
        });

        it('should not generate a new slug if it appears a custom slug was set', async function () {
            let controller = this.owner.lookup('controller:lexical-editor');
            controller.set('slugGenerator', EmberObject.create({
                generateSlug(slugType, str) {
                    return RSVP.resolve(`${str}-slug`);
                }
            }));

            controller.set('post', EmberObject.create({
                slug: 'custom-slug',
                title: 'original title',
                titleScratch: 'newTitle'
            }));

            expect(controller.get('post.slug')).to.equal('custom-slug');
            expect(controller.get('post.titleScratch')).to.equal('newTitle');

            await controller.generateSlugTask.perform();

            expect(controller.get('post.slug')).to.equal('custom-slug');
        });

        it('should generate new slugs if the title changes', async function () {
            let controller = this.owner.lookup('controller:lexical-editor');
            controller.set('slugGenerator', EmberObject.create({
                generateSlug(slugType, str) {
                    return RSVP.resolve(`${str}-slug`);
                }
            }));
            controller.set('post', EmberObject.create({
                slug: 'somepost',
                title: 'somepost',
                titleScratch: 'newtitle'
            }));

            await controller.generateSlugTask.perform();

            expect(controller.get('post.slug')).to.equal('newtitle-slug');
        });
    });

    describe('saveTitleTask', function () {
        beforeEach(function () {
            this.controller = this.owner.lookup('controller:lexical-editor');
            this.controller.set('target', {send() {}});
            defineProperty(this.controller, 'autosaveTask', task(function * () {
                yield RSVP.resolve();
            }));
        });

        it('should invoke generateSlug if the post is not published', async function () {
            let {controller} = this;

            controller.set('target', {send() {}});
            defineProperty(controller, 'generateSlugTask', task(function * () {
                this.set('post.slug', 'test-slug');
                yield RSVP.resolve();
            }));

            controller.set('post', EmberObject.create({isDraft: true}));

            expect(controller.get('post.isDraft')).to.be.true;
            expect(controller.get('post.titleScratch')).to.not.be.ok;

            controller.set('post.titleScratch', 'test');
            await controller.saveTitleTask.perform();

            expect(controller.get('post.titleScratch')).to.equal('test');
            expect(controller.get('post.slug')).to.equal('test-slug');
        });

        it('should not invoke generateSlug if the post is published', async function () {
            let {controller} = this;

            controller.set('target', {send() {}});
            controller.set('post', EmberObject.create({
                title: 'a title',
                isPublished: true
            }));

            expect(controller.get('post.isPublished')).to.be.true;
            expect(controller.get('post.title')).to.equal('a title');
            expect(controller.get('post.titleScratch')).to.not.be.ok;

            controller.set('post.titleScratch', 'test');
            await controller.saveTitleTask.perform();

            expect(controller.get('post.titleScratch')).to.equal('test');
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
                lexicalScratch: initialLexicalString,
                secondaryLexicalState: initialLexicalString
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

        it('dirty is false if secondaryLexical and scratch matches, but lexical is outdated', async function () {
            const initialLexicalString = `{"root":{"children":[{"children": [{"detail": 0,"format": 0,"mode": "normal","style": "","text": "Sample content","type": "extended-text","version": 1}],"direction": null,"format": "","indent": 0,"type": "paragraph","version": 1}],"direction": "ltr","format": "","indent": 0,"type": "root","version": 1}}`;
            const lexicalScratch = `{"root":{"children":[{"children": [{"detail": 0,"format": 0,"mode": "normal","style": "","text": "Sample content","type": "extended-text","version": 1}],"direction": "ltr","format": "","indent": 0,"type": "paragraph","version": 1}],"direction": "ltr","format": "","indent": 0,"type": "root","version": 1}}`;
            const secondLexicalInstance = `{"root":{"children":[{"children": [{"detail": 0,"format": 0,"mode": "normal","style": "","text": "Here's some new text","type": "extended-text","version": 1}],"direction": "ltr","format": "","indent": 0,"type": "paragraph","version": 1}],"direction": "ltr","format": "","indent": 0,"type": "root","version": 1}}`;

            let controller = this.owner.lookup('controller:lexical-editor');
            controller.set('post', EmberObject.create({
                title: 'this is a title',
                titleScratch: 'this is a title',
                status: 'published',
                lexical: initialLexicalString,
                lexicalScratch: lexicalScratch,
                secondaryLexicalState: secondLexicalInstance
            }));

            let isDirty = controller.get('hasDirtyAttributes');

            expect(isDirty).to.be.false;
        });

        it('dirty is true if secondaryLexical and lexical does not match scratch', async function () {
            const initialLexicalString = `{"root":{"children":[{"children": [{"detail": 0,"format": 0,"mode": "normal","style": "","text": "Sample content","type": "extended-text","version": 1}],"direction": null,"format": "","indent": 0,"type": "paragraph","version": 1}],"direction": "ltr","format": "","indent": 0,"type": "root","version": 1}}`;
            const lexicalScratch = `{"root":{"children":[{"children": [{"detail": 0,"format": 0,"mode": "normal","style": "","text": "Sample content1234","type": "extended-text","version": 1}],"direction": "ltr","format": "","indent": 0,"type": "paragraph","version": 1}],"direction": "ltr","format": "","indent": 0,"type": "root","version": 1}}`;
            const secondLexicalInstance = `{"root":{"children":[{"children": [{"detail": 0,"format": 0,"mode": "normal","style": "","text": "Here's some new text","type": "extended-text","version": 1}],"direction": "ltr","format": "","indent": 0,"type": "paragraph","version": 1}],"direction": "ltr","format": "","indent": 0,"type": "root","version": 1}}`;

            let controller = this.owner.lookup('controller:lexical-editor');
            controller.set('post', EmberObject.create({
                title: 'this is a title',
                titleScratch: 'this is a title',
                status: 'published',
                lexical: initialLexicalString,
                lexicalScratch: lexicalScratch,
                secondaryLexicalState: secondLexicalInstance
            }));

            controller.send('updateScratch',JSON.parse(lexicalScratch));

            let isDirty = controller.get('hasDirtyAttributes');

            expect(isDirty).to.be.true;
        });
    });
});
