import EmberObject from '@ember/object';
import RSVP from 'rsvp';
import {authenticateSession} from 'ember-simple-auth/test-support';
import {defineProperty} from '@ember/object';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {settled} from '@ember/test-helpers';
import {setupTest} from 'ember-mocha';
import {task} from 'ember-concurrency';

describe('Unit: Controller: lexical-editor', function () {
    setupTest();

    let createPost;

    const _createPost = function (attrs) {
        const store = this.owner.lookup('service:store');
        return store.createRecord('post', attrs);
    };

    beforeEach(function () {
        createPost = _createPost.bind(this);
    });

    describe('generateSlug', function () {
        it('should generate a slug and set it on the post', async function () {
            let controller = this.owner.lookup('controller:lexical-editor');
            controller.set('slugGenerator', EmberObject.create({
                generateSlug(slugType, str) {
                    return RSVP.resolve(`${str}-slug`);
                }
            }));
            controller.set('post', createPost({slug: ''}));

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
            controller.set('post', createPost({slug: 'whatever'}));

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
            controller.set('post', createPost({
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

            controller.set('post', createPost({
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

            controller.set('post', createPost({
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
            controller.set('post', createPost({
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

            controller.set('post', createPost({isDraft: true}));

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
            controller.set('post', createPost({
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

            controller.set('post', createPost({titleScratch: 'this is a title'}));

            expect(controller.get('tkCount')).to.equal(0);
        });

        it('should count TK reminders in the title', async function () {
            let controller = this.owner.lookup('controller:lexical-editor');

            controller.set('post', createPost({titleScratch: 'this is a TK'}));

            expect(controller.get('tkCount')).to.equal(1);
        });
    });

    describe('hasDirtyAttributes', function () {
        it('detects new post with changed attributes as dirty (autosave)', async function () {
            const initialLexicalString = `{"root":{"children":[{"children": [{"detail": 0,"format": 0,"mode": "normal","style": "","text": "Sample content","type": "extended-text","version": 1}],"direction": null,"format": "","indent": 0,"type": "paragraph","version": 1}],"direction": "ltr","format": "","indent": 0,"type": "root","version": 1}}`;
            const lexicalScratch = `{"root":{"children":[{"children": [{"detail": 0,"format": 0,"mode": "normal","style": "","text": "Sample content updated","type": "extended-text","version": 1}],"direction": null,"format": "","indent": 0,"type": "paragraph","version": 1}],"direction": "ltr","format": "","indent": 0,"type": "root","version": 1}}`;
            let controller = this.owner.lookup('controller:lexical-editor');
            controller.set('post', createPost({
                title: '',
                titleScratch: '',
                status: 'draft',
                lexical: initialLexicalString,
                lexicalScratch: lexicalScratch,
                secondaryLexicalState: initialLexicalString
            }));

            let isDirty = controller.hasDirtyAttributes;
            expect(isDirty).to.be.true;
        });

        it('does not detect new post as dirty when there are no changes', async function () {
            const controller = this.owner.lookup('controller:lexical-editor');
            const post = createPost({});
            post.titleScratch = post.title;
            post.lexicalScratch = post.lexical;
            controller.set('post', post);

            let isDirty = controller.hasDirtyAttributes;
            expect(isDirty).to.be.false;
        });

        it('marks isNew post as dirty when lexicalScratch differs from lexical and secondaryLexical', async function () {
            const initialLexicalString = `{"root":{"children":[{"children": [{"detail": 0,"format": 0,"mode": "normal","style": "","text": "Sample content","type": "extended-text","version": 1}],"direction": null,"format": "","indent": 0,"type": "paragraph","version": 1}],"direction": "ltr","format": "","indent": 0,"type": "root","version": 1}}`;
            const lexicalScratch = `{"root":{"children":[{"children": [{"detail": 0,"format": 0,"mode": "normal","style": "","text": "Sample content scratch","type": "extended-text","version": 1}],"direction": null,"format": "","indent": 0,"type": "paragraph","version": 1}],"direction": "ltr","format": "","indent": 0,"type": "root","version": 1}}`;
            let controller = this.owner.lookup('controller:lexical-editor');
            controller.set('post', createPost({
                title: '',
                titleScratch: '',
                status: 'draft',
                lexical: initialLexicalString,
                lexicalScratch: lexicalScratch,
                secondaryLexicalState: initialLexicalString,
                changedAttributes: () => ({title: ['', 'New Title']})
            }));

            let isDirty = controller.hasDirtyAttributes;
            expect(isDirty).to.be.true;
        });

        it('Changes in the direction field in the lexical string are not considered dirty', async function () {
            let controller = this.owner.lookup('controller:lexical-editor');

            const initialLexicalString = `{"root":{"children":[{"children": [{"detail": 0,"format": 0,"mode": "normal","style": "","text": "Sample content","type": "extended-text","version": 1}],"direction": null,"format": "","indent": 0,"type": "paragraph","version": 1}],"direction": "ltr","format": "","indent": 0,"type": "root","version": 1}}`;
            const lexicalStringNoNullDirection = `{"root":{"children":[{"children": [{"detail": 0,"format": 0,"mode": "normal","style": "","text": "Sample content","type": "extended-text","version": 1}],"direction": "ltr","format": "","indent": 0,"type": "paragraph","version": 1}],"direction": "ltr","format": "","indent": 0,"type": "root","version": 1}}`;
            const lexicalStringUpdatedContent = `{"root":{"children":[{"children": [{"detail": 0,"format": 0,"mode": "normal","style": "","text": "Here's some new text","type": "extended-text","version": 1}],"direction": "ltr","format": "","indent": 0,"type": "paragraph","version": 1}],"direction": "ltr","format": "","indent": 0,"type": "root","version": 1}}`;

            const post = createPost({
                title: 'this is a title',
                status: 'published',
                lexical: initialLexicalString,
                tags: [],
                authors: [],
                postRevisions: []
            });
            const postJson = {...post.serialize(), id: 1};
            this.owner.lookup('service:store').unloadRecord(post);
            this.owner.lookup('service:store').pushPayload({posts: [postJson]});
            // scratch attrs are not serialized/deserialized so need to be set manually
            const savedPost = this.owner.lookup('service:store').peekRecord('post', 1);
            savedPost.titleScratch = postJson.title;
            savedPost.lexicalScratch = initialLexicalString;
            savedPost.secondaryLexicalState = initialLexicalString;
            controller.set('post', savedPost);

            // synthetically update the lexicalScratch as if the editor itself made the modifications on loading the initial editorState
            controller.send('updateScratch',JSON.parse(lexicalStringNoNullDirection));

            // this should NOT result in the post being dirty - while lexical !== lexicalScratch, we ignore the direction field
            let isDirty = controller.hasDirtyAttributes;
            expect(isDirty).to.be.false;

            // now we try a synthetic change in the actual text content that should result in a dirty post
            controller.send('updateScratch',JSON.parse(lexicalStringUpdatedContent));

            // this should NOT result in the post being dirty - while lexical !== lexicalScratch, we ignore the direction field
            isDirty = controller.hasDirtyAttributes;
            expect(isDirty).to.be.true;
        });

        it('dirty is false if secondaryLexical and scratch matches, but lexical is outdated', async function () {
            const initialLexicalString = `{"root":{"children":[{"children": [{"detail": 0,"format": 0,"mode": "normal","style": "","text": "Sample content","type": "extended-text","version": 1}],"direction": null,"format": "","indent": 0,"type": "paragraph","version": 1}],"direction": "ltr","format": "","indent": 0,"type": "root","version": 1}}`;
            const lexicalScratch = `{"root":{"children":[{"children": [{"detail": 0,"format": 0,"mode": "normal","style": "","text": "Sample content","type": "extended-text","version": 1}],"direction": "ltr","format": "","indent": 0,"type": "paragraph","version": 1}],"direction": "ltr","format": "","indent": 0,"type": "root","version": 1}}`;
            const secondLexicalInstance = `{"root":{"children":[{"children": [{"detail": 0,"format": 0,"mode": "normal","style": "","text": "Here's some new text","type": "extended-text","version": 1}],"direction": "ltr","format": "","indent": 0,"type": "paragraph","version": 1}],"direction": "ltr","format": "","indent": 0,"type": "root","version": 1}}`;

            let controller = this.owner.lookup('controller:lexical-editor');

            const post = createPost({
                title: 'this is a title',
                status: 'published',
                lexical: initialLexicalString,
                tags: [],
                authors: [],
                postRevisions: []
            });
            const postJson = {...post.serialize(), id: 1};
            this.owner.lookup('service:store').unloadRecord(post);
            this.owner.lookup('service:store').pushPayload({posts: [postJson]});
            // scratch attrs are not serialized/deserialized so need to be set manually
            const savedPost = this.owner.lookup('service:store').peekRecord('post', 1);
            savedPost.titleScratch = postJson.title;
            savedPost.lexicalScratch = lexicalScratch;
            savedPost.secondaryLexicalState = secondLexicalInstance;
            controller.set('post', savedPost);

            let isDirty = controller.hasDirtyAttributes;

            expect(isDirty).to.be.false;
        });

        it('dirty is true if secondaryLexical and lexical does not match scratch', async function () {
            const initialLexicalString = `{"root":{"children":[{"children": [{"detail": 0,"format": 0,"mode": "normal","style": "","text": "Sample content","type": "extended-text","version": 1}],"direction": null,"format": "","indent": 0,"type": "paragraph","version": 1}],"direction": "ltr","format": "","indent": 0,"type": "root","version": 1}}`;
            const lexicalScratch = `{"root":{"children":[{"children": [{"detail": 0,"format": 0,"mode": "normal","style": "","text": "Sample content1234","type": "extended-text","version": 1}],"direction": "ltr","format": "","indent": 0,"type": "paragraph","version": 1}],"direction": "ltr","format": "","indent": 0,"type": "root","version": 1}}`;
            const secondLexicalInstance = `{"root":{"children":[{"children": [{"detail": 0,"format": 0,"mode": "normal","style": "","text": "Here's some new text","type": "extended-text","version": 1}],"direction": "ltr","format": "","indent": 0,"type": "paragraph","version": 1}],"direction": "ltr","format": "","indent": 0,"type": "root","version": 1}}`;

            let controller = this.owner.lookup('controller:lexical-editor');

            const post = createPost({
                title: 'this is a title',
                status: 'published',
                lexical: initialLexicalString,
                tags: [],
                authors: [],
                postRevisions: []
            });
            const postJson = {...post.serialize(), id: 1};
            this.owner.lookup('service:store').unloadRecord(post);
            this.owner.lookup('service:store').pushPayload({posts: [postJson]});
            // scratch attrs are not serialized/deserialized so need to be set manually
            const savedPost = this.owner.lookup('service:store').peekRecord('post', 1);
            savedPost.titleScratch = postJson.title;
            savedPost.lexicalScratch = lexicalScratch;
            savedPost.secondaryLexicalState = secondLexicalInstance;
            controller.set('post', savedPost);

            controller.send('updateScratch',JSON.parse(lexicalScratch));

            let isDirty = controller.hasDirtyAttributes;

            expect(isDirty).to.be.true;
        });

        it('dirty is false if no Post', async function () {
            let controller = this.owner.lookup('controller:lexical-editor');
            controller.set('post', null);

            let isDirty = controller.hasDirtyAttributes;

            expect(isDirty).to.be.false;
        });

        it('returns true if current tags differ from previous tags', async function () {
            let controller = this.owner.lookup('controller:lexical-editor');
            const tag1 = this.owner.lookup('service:store').createRecord('tag', {id: 1, name: 'test'});
            const tag2 = this.owner.lookup('service:store').createRecord('tag', {id: 2, name: 'changed'});
            const post = createPost({
                tags: [tag1],
                authors: [],
                postRevisions: []
            });
            const postJson = {...post.serialize(), id: 1};
            this.owner.lookup('service:store').unloadRecord(post);
            this.owner.lookup('service:store').pushPayload({posts: [postJson]});

            const savedPost = this.owner.lookup('service:store').peekRecord('post', 1);
            controller.set('post', savedPost);

            savedPost.tags = [tag1, tag2];

            let isDirty = controller.hasDirtyAttributes;

            expect(isDirty).to.be.true;
        });

        it('returns false when the post is new but has no changed attributes', async function () {
            let controller = this.owner.lookup('controller:lexical-editor');
            // no attrs = defaults = empty changedAttributes
            const post = createPost({});
            controller.set('post', post);
            // update scratch attrs to match controller.setPost behavior
            post.titleScratch = post.title;
            post.lexicalScratch = post.lexical;

            let isDirty = controller.hasDirtyAttributes;
            expect(isDirty).to.be.false;
        });

        it('skips new post check if post is not new', async function () {
            let controller = this.owner.lookup('controller:lexical-editor');
            const post = createPost({
                title: 'Sample Title',
                status: 'draft',
                lexical: '',
                tags: [],
                authors: [],
                postRevisions: []
            });
            const postJson = {...post.serialize(), id: 1};
            this.owner.lookup('service:store').unloadRecord(post);
            this.owner.lookup('service:store').pushPayload({posts: [postJson]});
            // scratch attrs are not serialized/deserialized so need to be set manually
            const savedPost = this.owner.lookup('service:store').peekRecord('post', 1);
            savedPost.titleScratch = 'Sample Title';
            savedPost.lexicalScratch = '';
            savedPost.secondaryLexicalState = '';
            controller.set('post', savedPost);

            let isDirty = controller.hasDirtyAttributes;
            // The test passes if no errors occur and it doesn't return true for new post condition
            expect(isDirty).to.be.false;
        });
    });

    describe('post state debugging', function () {
        let controller, store;

        beforeEach(async function () {
            controller = this.owner.lookup('controller:lexical-editor');
            store = this.owner.lookup('service:store');

            // avoid any unwanted network calls
            const slugGenerator = this.owner.lookup('service:slug-generator');
            slugGenerator.generateSlug = async () => 'test-slug';

            Object.defineProperty(controller, 'backgroundLoaderTask', {
                get: () => ({perform: () => {}})
            });

            // avoid waiting forever for authenticate modal
            await authenticateSession();
        });

        afterEach(function () {
            sinon.restore();
        });

        it('should call _getNotFoundErrorContext() when hitting 404 during save', async function () {
            const getErrorContextSpy = sinon.spy(controller, '_getNotFoundErrorContext');

            const post = createPost();
            post.save = () => RSVP.reject(404);

            controller.set('post', post);
            await controller.saveTask.perform(); // should not throw

            expect(getErrorContextSpy.calledOnce).to.be.true;
        });

        it('_getNotFoundErrorContext() includes setPost model state', async function () {
            const newPost = store.createRecord('post');
            controller.setPost(newPost);
            expect(controller._getNotFoundErrorContext().setPostState).to.equal('root.loaded.created.uncommitted');
        });

        it('_getNotFoundErrorContext() includes current model state', async function () {
            const newPost = store.createRecord('post');
            controller.setPost(newPost);
            controller.post = {currentState: {stateName: 'this.is.a.test'}};
            expect(controller._getNotFoundErrorContext().currentPostState).to.equal('this.is.a.test');
        });

        it('_getNotFoundErrorContext() includes all post states', async function () {
            const newPost = store.createRecord('post');
            controller.setPost(newPost);
            controller.post = {currentState: {stateName: 'state.one'}};
            controller.post = {currentState: {stateName: 'state.two'}};
            expect(controller._getNotFoundErrorContext().allPostStates).to.deep.equal(
                ['root.loaded.created.uncommitted', 'state.one', 'state.two']
            );
        });
    });
});
