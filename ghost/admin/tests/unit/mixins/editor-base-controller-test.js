/* jshint expr:true */
import {expect} from 'chai';
import {
    describe,
    it
} from 'mocha';
import EmberObject from 'ember-object';
import RSVP from 'rsvp';
import run from 'ember-runloop';
import {task} from 'ember-concurrency';
import EditorBaseControllerMixin from 'ghost-admin/mixins/editor-base-controller';
import wait from 'ember-test-helpers/wait';

describe('Unit: Mixin: editor-base-controller', function() {
    describe('generateSlug', function () {
        it('should generate a slug and set it on the model', function (done) {
            let object;

            run(() => {
                object = EmberObject.extend(EditorBaseControllerMixin, {
                    slugGenerator: EmberObject.create({
                        generateSlug(slugType, str) {
                            return RSVP.resolve(`${str}-slug`);
                        }
                    }),
                    model: EmberObject.create({slug: ''})
                }).create();

                object.set('model.titleScratch', 'title');

                expect(object.get('model.slug')).to.equal('');

                run(() => {
                    object.get('generateSlug').perform();
                });

                wait().then(() => {
                    expect(object.get('model.slug')).to.equal('title-slug');
                    done();
                });
            });
        });

        it('should not set the destination if the title is "(Untitled)" and the post already has a slug', function (done) {
            let object;

            run(() => {
                object = EmberObject.extend(EditorBaseControllerMixin, {
                    slugGenerator: EmberObject.create({
                        generateSlug(slugType, str) {
                            return RSVP.resolve(`${str}-slug`);
                        }
                    }),
                    model: EmberObject.create({
                        slug: 'whatever'
                    })
                }).create();
            });

            expect(object.get('model.slug')).to.equal('whatever');

            object.set('model.titleScratch', '(Untitled)');

            run(() => {
                object.get('generateSlug').perform();
            });

            wait().then(() => {
                expect(object.get('model.slug')).to.equal('whatever');
                done();
            });
        });
    });

    describe('updateTitle', function () {
        it('should invoke generateSlug if the post is new and a title has not been set', function (done) {
            let object;

            run(() => {
                object = EmberObject.extend(EditorBaseControllerMixin, {
                    model: EmberObject.create({isNew: true}),
                    generateSlug: task(function* () {
                        this.set('model.slug', 'test-slug');
                        yield RSVP.resolve();
                    })
                }).create();
            });

            expect(object.get('model.isNew')).to.be.true;
            expect(object.get('model.titleScratch')).to.not.be.ok;

            run(() => {
                object.get('updateTitle').perform('test');
            });

            wait().then(() => {
                expect(object.get('model.titleScratch')).to.equal('test');
                expect(object.get('model.slug')).to.equal('test-slug');
                done();
            });
        });

        it('should invoke generateSlug if the post is not new and a title is "(Untitled)"', function (done) {
            let object;

            run(() => {
                object = EmberObject.extend(EditorBaseControllerMixin, {
                    model: EmberObject.create({isNew: false}),
                    generateSlug: task(function* () {
                        this.set('model.slug', 'test-slug');
                        yield RSVP.resolve();
                    })
                }).create();
            });

            expect(object.get('model.isNew')).to.be.false;
            expect(object.get('model.titleScratch')).to.not.be.ok;

            run(() => {
                object.get('updateTitle').perform('(Untitled)');
            });

            wait().then(() => {
                expect(object.get('model.titleScratch')).to.equal('(Untitled)');
                expect(object.get('model.slug')).to.equal('test-slug');
                done();
            });
        });

        it('should not invoke generateSlug if the post is new but has a title', function (done) {
            let object;

            run(() => {
                object = EmberObject.extend(EditorBaseControllerMixin, {
                    model: EmberObject.create({
                        isNew: true,
                        title: 'a title'
                    }),
                    generateSlug: task(function* () {
                        expect(false, 'generateSlug should not be called').to.equal(true);

                        yield RSVP.resolve();
                    })
                }).create();
            });

            expect(object.get('model.isNew')).to.be.true;
            expect(object.get('model.title')).to.equal('a title');
            expect(object.get('model.titleScratch')).to.not.be.ok;

            run(() => {
                object.get('updateTitle').perform('test');
            });

            wait().then(() => {
                expect(object.get('model.titleScratch')).to.equal('test');
                expect(object.get('model.slug')).to.not.be.ok;
                done();
            });
        });

        it('should not invoke generateSlug if the post is not new and the title is not "(Untitled)"', function (done) {
            let object;

            run(() => {
                object = EmberObject.extend(EditorBaseControllerMixin, {
                    model: EmberObject.create({isNew: false}),
                    generateSlug: task(function* () {
                        expect(false, 'generateSlug should not be called').to.equal(true);

                        yield RSVP.resolve();
                    })
                }).create();
            });

            expect(object.get('model.isNew')).to.be.false;
            expect(object.get('model.title')).to.not.be.ok;

            run(() => {
                object.get('updateTitle').perform('title');
            });

            wait().then(() => {
                expect(object.get('model.titleScratch')).to.equal('title');
                expect(object.get('model.slug')).to.not.be.ok;
                done();
            });
        });
    });
});
