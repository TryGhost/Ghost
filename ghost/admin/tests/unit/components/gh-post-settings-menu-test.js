// /* eslint-disable camelcase */
// import EmberObject from '@ember/object';
// import RSVP from 'rsvp';
// import boundOneWay from 'ghost-admin/utils/bound-one-way';
// import {describe, it} from 'mocha';
// import {expect} from 'chai';
// import {run} from '@ember/runloop';
// import {setupComponentTest} from 'ember-mocha';

// function K() {
//     return this;
// }

// TODO: convert to integration tests
// (commented out because top-level describe.skip was tripping up ember-mocha)

// describe('Unit: Component: post-settings-menu', function () {
//     setupComponentTest('gh-post-settings-menu', {
//         needs: ['service:notifications', 'service:slug-generator', 'service:settings']
//     });

//     it('slugValue is one-way bound to post.slug', function () {
//         let component = this.subject({
//             post: EmberObject.create({
//                 slug: 'a-slug'
//             })
//         });

//         expect(component.get('post.slug')).to.equal('a-slug');
//         expect(component.get('slugValue')).to.equal('a-slug');

//         run(function () {
//             component.set('post.slug', 'changed-slug');

//             expect(component.get('slugValue')).to.equal('changed-slug');
//         });

//         run(function () {
//             component.set('slugValue', 'changed-directly');

//             expect(component.get('post.slug')).to.equal('changed-slug');
//             expect(component.get('slugValue')).to.equal('changed-directly');
//         });

//         run(function () {
//             // test that the one-way binding is still in place
//             component.set('post.slug', 'should-update');

//             expect(component.get('slugValue')).to.equal('should-update');
//         });
//     });

//     it('metaTitleScratch is one-way bound to post.metaTitle', function () {
//         let component = this.subject({
//             post: EmberObject.extend({
//                 metaTitle: 'a title',
//                 metaTitleScratch: boundOneWay('metaTitle')
//             }).create()
//         });

//         expect(component.get('post.metaTitle')).to.equal('a title');
//         expect(component.get('metaTitleScratch')).to.equal('a title');

//         run(function () {
//             component.set('post.metaTitle', 'a different title');

//             expect(component.get('metaTitleScratch')).to.equal('a different title');
//         });

//         run(function () {
//             component.set('metaTitleScratch', 'changed directly');

//             expect(component.get('post.metaTitle')).to.equal('a different title');
//             expect(component.get('post.metaTitleScratch')).to.equal('changed directly');
//         });

//         run(function () {
//             // test that the one-way binding is still in place
//             component.set('post.metaTitle', 'should update');

//             expect(component.get('metaTitleScratch')).to.equal('should update');
//         });
//     });

//     it('metaDescriptionScratch is one-way bound to post.metaDescription', function () {
//         let component = this.subject({
//             post: EmberObject.extend({
//                 metaDescription: 'a description',
//                 metaDescriptionScratch: boundOneWay('metaDescription')
//             }).create()
//         });

//         expect(component.get('post.metaDescription')).to.equal('a description');
//         expect(component.get('metaDescriptionScratch')).to.equal('a description');

//         run(function () {
//             component.set('post.metaDescription', 'a different description');

//             expect(component.get('metaDescriptionScratch')).to.equal('a different description');
//         });

//         run(function () {
//             component.set('metaDescriptionScratch', 'changed directly');

//             expect(component.get('post.metaDescription')).to.equal('a different description');
//             expect(component.get('metaDescriptionScratch')).to.equal('changed directly');
//         });

//         run(function () {
//             // test that the one-way binding is still in place
//             component.set('post.metaDescription', 'should update');

//             expect(component.get('metaDescriptionScratch')).to.equal('should update');
//         });
//     });

//     describe('seoTitle', function () {
//         it('should be the metaTitle if one exists', function () {
//             let component = this.subject({
//                 post: EmberObject.extend({
//                     titleScratch: 'should not be used',
//                     metaTitle: 'a meta-title',
//                     metaTitleScratch: boundOneWay('metaTitle')
//                 }).create()
//             });

//             expect(component.get('seoTitle')).to.equal('a meta-title');
//         });

//         it('should default to the title if an explicit meta-title does not exist', function () {
//             let component = this.subject({
//                 post: EmberObject.create({
//                     titleScratch: 'should be the meta-title'
//                 })
//             });

//             expect(component.get('seoTitle')).to.equal('should be the meta-title');
//         });

//         it('should be the metaTitle if both title and metaTitle exist', function () {
//             let component = this.subject({
//                 post: EmberObject.extend({
//                     titleScratch: 'a title',
//                     metaTitle: 'a meta-title',
//                     metaTitleScratch: boundOneWay('metaTitle')
//                 }).create()
//             });

//             expect(component.get('seoTitle')).to.equal('a meta-title');
//         });

//         it('should revert to the title if explicit metaTitle is removed', function () {
//             let component = this.subject({
//                 post: EmberObject.extend({
//                     titleScratch: 'a title',
//                     metaTitle: 'a meta-title',
//                     metaTitleScratch: boundOneWay('metaTitle')
//                 }).create()
//             });

//             expect(component.get('seoTitle')).to.equal('a meta-title');

//             run(function () {
//                 component.set('post.metaTitle', '');

//                 expect(component.get('seoTitle')).to.equal('a title');
//             });
//         });

//         it('should truncate to 70 characters with an appended ellipsis', function () {
//             let longTitle = new Array(100).join('a');
//             let component = this.subject({
//                 post: EmberObject.create()
//             });

//             expect(longTitle.length).to.equal(99);

//             run(function () {
//                 let expected = `${longTitle.substr(0, 70)}&hellip;`;

//                 component.set('metaTitleScratch', longTitle);

//                 expect(component.get('seoTitle').toString().length).to.equal(78);
//                 expect(component.get('seoTitle').toString()).to.equal(expected);
//             });
//         });
//     });

//     describe('seoDescription', function () {
//         it('should be the metaDescription if one exists', function () {
//             let component = this.subject({
//                 post: EmberObject.extend({
//                     metaDescription: 'a description',
//                     metaDescriptionScratch: boundOneWay('metaDescription')
//                 }).create()
//             });

//             expect(component.get('seoDescription')).to.equal('a description');
//         });

//         it('should be generated from the rendered mobiledoc if not explicitly set', function () {
//             let component = this.subject({
//                 post: EmberObject.extend({
//                     metaDescription: null,
//                     metaDescriptionScratch: boundOneWay('metaDescription'),
//                     author: RSVP.resolve(),

//                     init() {
//                         this._super(...arguments);
//                         this.scratch = {
//                             cards: [
//                                 ['markdown-card', {
//                                     markdown: '# This is a <strong>test</strong> <script>foo</script>'
//                                 }]
//                             ]
//                         };
//                     }
//                 }).create()
//             });

//             expect(component.get('seoDescription')).to.equal('This is a test');
//         });

//         it('should truncate to 156 characters with an appended ellipsis', function () {
//             let longDescription = new Array(200).join('a');
//             let component = this.subject({
//                 post: EmberObject.create()
//             });

//             expect(longDescription.length).to.equal(199);

//             run(function () {
//                 let expected = `${longDescription.substr(0, 156)}&hellip;`;

//                 component.set('metaDescriptionScratch', longDescription);

//                 expect(component.get('seoDescription').toString().length).to.equal(164);
//                 expect(component.get('seoDescription').toString()).to.equal(expected);
//             });
//         });
//     });

//     describe('seoURL', function () {
//         it('should be the URL of the blog if no post slug exists', function () {
//             let component = this.subject({
//                 config: EmberObject.create({blogUrl: 'http://my-ghost-blog.com'}),
//                 post: EmberObject.create()
//             });

//             expect(component.get('seoURL')).to.equal('http://my-ghost-blog.com/');
//         });

//         it('should be the URL of the blog plus the post slug', function () {
//             let component = this.subject({
//                 config: EmberObject.create({blogUrl: 'http://my-ghost-blog.com'}),
//                 post: EmberObject.create({slug: 'post-slug'})
//             });

//             expect(component.get('seoURL')).to.equal('http://my-ghost-blog.com/post-slug/');
//         });

//         it('should update when the post slug changes', function () {
//             let component = this.subject({
//                 config: EmberObject.create({blogUrl: 'http://my-ghost-blog.com'}),
//                 post: EmberObject.create({slug: 'post-slug'})
//             });

//             expect(component.get('seoURL')).to.equal('http://my-ghost-blog.com/post-slug/');

//             run(function () {
//                 component.set('post.slug', 'changed-slug');

//                 expect(component.get('seoURL')).to.equal('http://my-ghost-blog.com/changed-slug/');
//             });
//         });

//         it('should truncate a long URL to 70 characters with an appended ellipsis', function () {
//             let blogURL = 'http://my-ghost-blog.com';
//             let longSlug = new Array(75).join('a');
//             let component = this.subject({
//                 config: EmberObject.create({blogUrl: blogURL}),
//                 post: EmberObject.create({slug: longSlug})
//             });
//             let expected;

//             expect(longSlug.length).to.equal(74);

//             expected = `${blogURL}/${longSlug}/`;
//             expected = `${expected.substr(0, 70)}&hellip;`;

//             expect(component.get('seoURL').toString().length).to.equal(78);
//             expect(component.get('seoURL').toString()).to.equal(expected);
//         });
//     });

//     describe('toggleFeatured', function () {
//         it('should toggle the featured property', function () {
//             let component = this.subject({
//                 post: EmberObject.create({
//                     featured: false,
//                     isNew: true
//                 })
//             });

//             run(function () {
//                 component.send('toggleFeatured');

//                 expect(component.get('post.featured')).to.be.ok;
//             });
//         });

//         it('should not save the post if it is still new', function () {
//             let component = this.subject({
//                 post: EmberObject.create({
//                     featured: false,
//                     isNew: true,
//                     save() {
//                         this.incrementProperty('saved');
//                         return RSVP.resolve();
//                     }
//                 })
//             });

//             run(function () {
//                 component.send('toggleFeatured');

//                 expect(component.get('post.featured')).to.be.ok;
//                 expect(component.get('post.saved')).to.not.be.ok;
//             });
//         });

//         it('should save the post if it is not new', function () {
//             let component = this.subject({
//                 post: EmberObject.create({
//                     featured: false,
//                     isNew: false,
//                     save() {
//                         this.incrementProperty('saved');
//                         return RSVP.resolve();
//                     }
//                 })
//             });

//             run(function () {
//                 component.send('toggleFeatured');

//                 expect(component.get('post.featured')).to.be.ok;
//                 expect(component.get('post.saved')).to.equal(1);
//             });
//         });
//     });

//     describe('updateSlug', function () {
//         it('should reset slugValue to the previous slug when the new slug is blank or unchanged', function () {
//             let component = this.subject({
//                 post: EmberObject.create({
//                     slug: 'slug'
//                 })
//             });

//             run(function () {
//                 // unchanged
//                 component.set('slugValue', 'slug');
//                 component.send('updateSlug', component.get('slugValue'));

//                 expect(component.get('post.slug')).to.equal('slug');
//                 expect(component.get('slugValue')).to.equal('slug');
//             });

//             run(function () {
//                 // unchanged after trim
//                 component.set('slugValue', 'slug  ');
//                 component.send('updateSlug', component.get('slugValue'));

//                 expect(component.get('post.slug')).to.equal('slug');
//                 expect(component.get('slugValue')).to.equal('slug');
//             });

//             run(function () {
//                 // blank
//                 component.set('slugValue', '');
//                 component.send('updateSlug', component.get('slugValue'));

//                 expect(component.get('post.slug')).to.equal('slug');
//                 expect(component.get('slugValue')).to.equal('slug');
//             });
//         });

//         it('should not set a new slug if the server-generated slug matches existing slug', function (done) {
//             let component = this.subject({
//                 slugGenerator: EmberObject.create({
//                     generateSlug(slugType, str) {
//                         let promise = RSVP.resolve(str.split('#')[0]);
//                         this.set('lastPromise', promise);
//                         return promise;
//                     }
//                 }),
//                 post: EmberObject.create({
//                     slug: 'whatever'
//                 })
//             });

//             run(function () {
//                 component.set('slugValue', 'whatever#slug');
//                 component.send('updateSlug', component.get('slugValue'));

//                 RSVP.resolve(component.get('lastPromise')).then(function () {
//                     expect(component.get('post.slug')).to.equal('whatever');

//                     done();
//                 }).catch(done);
//             });
//         });

//         it('should not set a new slug if the only change is to the appended increment value', function (done) {
//             let component = this.subject({
//                 slugGenerator: EmberObject.create({
//                     generateSlug(slugType, str) {
//                         let sanitizedStr = str.replace(/[^a-zA-Z]/g, '');
//                         let promise = RSVP.resolve(`${sanitizedStr}-2`);
//                         this.set('lastPromise', promise);
//                         return promise;
//                     }
//                 }),
//                 post: EmberObject.create({
//                     slug: 'whatever'
//                 })
//             });

//             run(function () {
//                 component.set('slugValue', 'whatever!');
//                 component.send('updateSlug', component.get('slugValue'));

//                 RSVP.resolve(component.get('lastPromise')).then(function () {
//                     expect(component.get('post.slug')).to.equal('whatever');

//                     done();
//                 }).catch(done);
//             });
//         });

//         it('should set the slug if the new slug is different', function (done) {
//             let component = this.subject({
//                 slugGenerator: EmberObject.create({
//                     generateSlug(slugType, str) {
//                         let promise = RSVP.resolve(str);
//                         this.set('lastPromise', promise);
//                         return promise;
//                     }
//                 }),
//                 post: EmberObject.create({
//                     slug: 'whatever',
//                     save: K
//                 })
//             });

//             run(function () {
//                 component.set('slugValue', 'changed');
//                 component.send('updateSlug', component.get('slugValue'));

//                 RSVP.resolve(component.get('lastPromise')).then(function () {
//                     expect(component.get('post.slug')).to.equal('changed');

//                     done();
//                 }).catch(done);
//             });
//         });

//         it('should save the post when the slug changes and the post is not new', function (done) {
//             let component = this.subject({
//                 slugGenerator: EmberObject.create({
//                     generateSlug(slugType, str) {
//                         let promise = RSVP.resolve(str);
//                         this.set('lastPromise', promise);
//                         return promise;
//                     }
//                 }),
//                 post: EmberObject.create({
//                     slug: 'whatever',
//                     saved: 0,
//                     isNew: false,
//                     save() {
//                         this.incrementProperty('saved');
//                     }
//                 })
//             });

//             run(function () {
//                 component.set('slugValue', 'changed');
//                 component.send('updateSlug', component.get('slugValue'));

//                 RSVP.resolve(component.get('lastPromise')).then(function () {
//                     expect(component.get('post.slug')).to.equal('changed');
//                     expect(component.get('post.saved')).to.equal(1);

//                     done();
//                 }).catch(done);
//             });
//         });

//         it('should not save the post when the slug changes and the post is new', function (done) {
//             let component = this.subject({
//                 slugGenerator: EmberObject.create({
//                     generateSlug(slugType, str) {
//                         let promise = RSVP.resolve(str);
//                         this.set('lastPromise', promise);
//                         return promise;
//                     }
//                 }),
//                 post: EmberObject.create({
//                     slug: 'whatever',
//                     saved: 0,
//                     isNew: true,
//                     save() {
//                         this.incrementProperty('saved');
//                     }
//                 })
//             });

//             run(function () {
//                 component.set('slugValue', 'changed');
//                 component.send('updateSlug', component.get('slugValue'));

//                 RSVP.resolve(component.get('lastPromise')).then(function () {
//                     expect(component.get('post.slug')).to.equal('changed');
//                     expect(component.get('post.saved')).to.equal(0);

//                     done();
//                 }).catch(done);
//             });
//         });
//     });
// });
