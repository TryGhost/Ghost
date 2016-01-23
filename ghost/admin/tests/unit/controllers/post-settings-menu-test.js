/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
import Ember from 'ember';
import {
    describeModule,
    it
} from 'ember-mocha';

const {run} = Ember;

function K() {
    return this;
}

describeModule(
    'controller:post-settings-menu',
    'Unit: Controller: post-settings-menu',
    {
        needs: ['controller:application', 'service:notifications', 'service:slug-generator']
    },

    function () {
        it('slugValue is one-way bound to model.slug', function () {
            let controller = this.subject({
                model: Ember.Object.create({
                    slug: 'a-slug'
                })
            });

            expect(controller.get('model.slug')).to.equal('a-slug');
            expect(controller.get('slugValue')).to.equal('a-slug');

            run(function () {
                controller.set('model.slug', 'changed-slug');

                expect(controller.get('slugValue')).to.equal('changed-slug');
            });

            run(function () {
                controller.set('slugValue', 'changed-directly');

                expect(controller.get('model.slug')).to.equal('changed-slug');
                expect(controller.get('slugValue')).to.equal('changed-directly');
            });

            run(function () {
                // test that the one-way binding is still in place
                controller.set('model.slug', 'should-update');

                expect(controller.get('slugValue')).to.equal('should-update');
            });
        });

        it('metaTitleScratch is one-way bound to model.metaTitle', function () {
            let controller = this.subject({
                model: Ember.Object.create({
                    metaTitle: 'a title'
                })
            });

            expect(controller.get('model.metaTitle')).to.equal('a title');
            expect(controller.get('metaTitleScratch')).to.equal('a title');

            run(function () {
                controller.set('model.metaTitle', 'a different title');

                expect(controller.get('metaTitleScratch')).to.equal('a different title');
            });

            run(function () {
                controller.set('metaTitleScratch', 'changed directly');

                expect(controller.get('model.metaTitle')).to.equal('a different title');
                expect(controller.get('metaTitleScratch')).to.equal('changed directly');
            });

            run(function () {
                // test that the one-way binding is still in place
                controller.set('model.metaTitle', 'should update');

                expect(controller.get('metaTitleScratch')).to.equal('should update');
            });
        });

        it('metaDescriptionScratch is one-way bound to model.metaDescription', function () {
            let controller = this.subject({
                model: Ember.Object.create({
                    metaDescription: 'a description'
                })
            });

            expect(controller.get('model.metaDescription')).to.equal('a description');
            expect(controller.get('metaDescriptionScratch')).to.equal('a description');

            run(function () {
                controller.set('model.metaDescription', 'a different description');

                expect(controller.get('metaDescriptionScratch')).to.equal('a different description');
            });

            run(function () {
                controller.set('metaDescriptionScratch', 'changed directly');

                expect(controller.get('model.metaDescription')).to.equal('a different description');
                expect(controller.get('metaDescriptionScratch')).to.equal('changed directly');
            });

            run(function () {
                // test that the one-way binding is still in place
                controller.set('model.metaDescription', 'should update');

                expect(controller.get('metaDescriptionScratch')).to.equal('should update');
            });
        });

        describe('seoTitle', function () {
            it('should be the metaTitle if one exists', function () {
                let controller = this.subject({
                    model: Ember.Object.create({
                        metaTitle: 'a meta-title',
                        titleScratch: 'should not be used'
                    })
                });

                expect(controller.get('seoTitle')).to.equal('a meta-title');
            });

            it('should default to the title if an explicit meta-title does not exist', function () {
                let controller = this.subject({
                    model: Ember.Object.create({
                        titleScratch: 'should be the meta-title'
                    })
                });

                expect(controller.get('seoTitle')).to.equal('should be the meta-title');
            });

            it('should be the metaTitle if both title and metaTitle exist', function () {
                let controller = this.subject({
                    model: Ember.Object.create({
                        metaTitle: 'a meta-title',
                        titleScratch: 'a title'
                    })
                });

                expect(controller.get('seoTitle')).to.equal('a meta-title');
            });

            it('should revert to the title if explicit metaTitle is removed', function () {
                let controller = this.subject({
                    model: Ember.Object.create({
                        metaTitle: 'a meta-title',
                        titleScratch: 'a title'
                    })
                });

                expect(controller.get('seoTitle')).to.equal('a meta-title');

                run(function () {
                    controller.set('model.metaTitle', '');

                    expect(controller.get('seoTitle')).to.equal('a title');
                });
            });

            it('should truncate to 70 characters with an appended ellipsis', function () {
                let longTitle = new Array(100).join('a');
                let controller = this.subject({
                    model: Ember.Object.create()
                });

                expect(longTitle.length).to.equal(99);

                run(function () {
                    let expected = `${longTitle.substr(0, 70)}&hellip;`;

                    controller.set('metaTitleScratch', longTitle);

                    expect(controller.get('seoTitle').toString().length).to.equal(78);
                    expect(controller.get('seoTitle').toString()).to.equal(expected);
                });
            });
        });

        describe('seoDescription', function () {
            it('should be the metaDescription if one exists', function () {
                let controller = this.subject({
                    model: Ember.Object.create({
                        metaDescription: 'a description'
                    })
                });

                expect(controller.get('seoDescription')).to.equal('a description');
            });

            it.skip('should be generated from the rendered markdown if not explicitly set', function () {
                // can't test right now because the rendered markdown is being pulled
                // from the DOM via jquery
            });

            it('should truncate to 156 characters with an appended ellipsis', function () {
                let longDescription = new Array(200).join('a');
                let controller = this.subject({
                    model: Ember.Object.create()
                });

                expect(longDescription.length).to.equal(199);

                run(function () {
                    let expected = `${longDescription.substr(0, 156)}&hellip;`;

                    controller.set('metaDescriptionScratch', longDescription);

                    expect(controller.get('seoDescription').toString().length).to.equal(164);
                    expect(controller.get('seoDescription').toString()).to.equal(expected);
                });
            });
        });

        describe('seoURL', function () {
            it('should be the URL of the blog if no post slug exists', function () {
                let controller = this.subject({
                    config: Ember.Object.create({blogUrl: 'http://my-ghost-blog.com'}),
                    model: Ember.Object.create()
                });

                expect(controller.get('seoURL')).to.equal('http://my-ghost-blog.com/');
            });

            it('should be the URL of the blog plus the post slug', function () {
                let controller = this.subject({
                    config: Ember.Object.create({blogUrl: 'http://my-ghost-blog.com'}),
                    model: Ember.Object.create({slug: 'post-slug'})
                });

                expect(controller.get('seoURL')).to.equal('http://my-ghost-blog.com/post-slug/');
            });

            it('should update when the post slug changes', function () {
                let controller = this.subject({
                    config: Ember.Object.create({blogUrl: 'http://my-ghost-blog.com'}),
                    model: Ember.Object.create({slug: 'post-slug'})
                });

                expect(controller.get('seoURL')).to.equal('http://my-ghost-blog.com/post-slug/');

                run(function () {
                    controller.set('model.slug', 'changed-slug');

                    expect(controller.get('seoURL')).to.equal('http://my-ghost-blog.com/changed-slug/');
                });
            });

            it('should truncate a long URL to 70 characters with an appended ellipsis', function () {
                let blogURL = 'http://my-ghost-blog.com';
                let longSlug = new Array(75).join('a');
                let controller = this.subject({
                    config: Ember.Object.create({blogUrl: blogURL}),
                    model: Ember.Object.create({slug: longSlug})
                });
                let expected;

                expect(longSlug.length).to.equal(74);

                expected = `${blogURL}/${longSlug}/`;
                expected = `${expected.substr(0, 70)}&hellip;`;

                expect(controller.get('seoURL').toString().length).to.equal(78);
                expect(controller.get('seoURL').toString()).to.equal(expected);
            });
        });

        describe('togglePage', function () {
            it('should toggle the page property', function () {
                let controller = this.subject({
                    model: Ember.Object.create({
                        page: false,
                        isNew: true
                    })
                });

                expect(controller.get('model.page')).to.not.be.ok;

                run(function () {
                    controller.send('togglePage');

                    expect(controller.get('model.page')).to.be.ok;
                });
            });

            it('should not save the post if it is still new', function () {
                let controller = this.subject({
                    model: Ember.Object.create({
                        page: false,
                        isNew: true,
                        save() {
                            this.incrementProperty('saved');
                            return Ember.RSVP.resolve();
                        }
                    })
                });

                run(function () {
                    controller.send('togglePage');

                    expect(controller.get('model.page')).to.be.ok;
                    expect(controller.get('model.saved')).to.not.be.ok;
                });
            });

            it('should save the post if it is not new', function () {
                let controller = this.subject({
                    model: Ember.Object.create({
                        page: false,
                        isNew: false,
                        save() {
                            this.incrementProperty('saved');
                            return Ember.RSVP.resolve();
                        }
                    })
                });

                run(function () {
                    controller.send('togglePage');

                    expect(controller.get('model.page')).to.be.ok;
                    expect(controller.get('model.saved')).to.equal(1);
                });
            });
        });

        describe('toggleFeatured', function () {
            it('should toggle the featured property', function () {
                let controller = this.subject({
                    model: Ember.Object.create({
                        featured: false,
                        isNew: true
                    })
                });

                run(function () {
                    controller.send('toggleFeatured');

                    expect(controller.get('model.featured')).to.be.ok;
                });
            });

            it('should not save the post if it is still new', function () {
                let controller = this.subject({
                    model: Ember.Object.create({
                        featured: false,
                        isNew: true,
                        save() {
                            this.incrementProperty('saved');
                            return Ember.RSVP.resolve();
                        }
                    })
                });

                run(function () {
                    controller.send('toggleFeatured');

                    expect(controller.get('model.featured')).to.be.ok;
                    expect(controller.get('model.saved')).to.not.be.ok;
                });
            });

            it('should save the post if it is not new', function () {
                let controller = this.subject({
                    model: Ember.Object.create({
                        featured: false,
                        isNew: false,
                        save() {
                            this.incrementProperty('saved');
                            return Ember.RSVP.resolve();
                        }
                    })
                });

                run(function () {
                    controller.send('toggleFeatured');

                    expect(controller.get('model.featured')).to.be.ok;
                    expect(controller.get('model.saved')).to.equal(1);
                });
            });
        });

        describe('generateAndSetSlug', function () {
            it('should generate a slug and set it on the destination', function (done) {
                let controller = this.subject({
                    slugGenerator: Ember.Object.create({
                        generateSlug(slugType, str) {
                            return Ember.RSVP.resolve(`${str}-slug`);
                        }
                    }),
                    model: Ember.Object.create({slug: ''})
                });

                run(function () {
                    controller.set('model.titleScratch', 'title');
                    controller.generateAndSetSlug('model.slug');

                    expect(controller.get('model.slug')).to.equal('');

                    Ember.RSVP.resolve(controller.get('lastPromise')).then(function () {
                        expect(controller.get('model.slug')).to.equal('title-slug');

                        done();
                    }).catch(done);
                });
            });

            it('should not set the destination if the title is "(Untitled)" and the post already has a slug', function (done) {
                let controller = this.subject({
                    slugGenerator: Ember.Object.create({
                        generateSlug(slugType, str) {
                            return Ember.RSVP.resolve(`${str}-slug`);
                        }
                    }),
                    model: Ember.Object.create({
                        slug: 'whatever'
                    })
                });

                expect(controller.get('model.slug')).to.equal('whatever');

                run(function () {
                    controller.set('model.titleScratch', 'title');

                    Ember.RSVP.resolve(controller.get('lastPromise')).then(function () {
                        expect(controller.get('model.slug')).to.equal('whatever');

                        done();
                    }).catch(done);
                });
            });
        });

        describe('titleObserver', function () {
            it('should invoke generateAndSetSlug if the post is new and a title has not been set', function (done) {
                let controller = this.subject({
                    model: Ember.Object.create({isNew: true}),
                    invoked: 0,
                    generateAndSetSlug() {
                        this.incrementProperty('invoked');
                    }
                });

                expect(controller.get('invoked')).to.equal(0);
                expect(controller.get('model.title')).to.not.be.ok;

                run(function () {
                    controller.set('model.titleScratch', 'test');

                    controller.titleObserver();

                    // since titleObserver invokes generateAndSetSlug with a delay of 700ms
                    // we need to make sure this assertion runs after that.
                    // probably a better way to handle this?
                    run.later(function () {
                        expect(controller.get('invoked')).to.equal(1);

                        done();
                    }, 800);
                });
            });

            it('should invoke generateAndSetSlug if the post title is "(Untitled)"', function (done) {
                let controller = this.subject({
                    model: Ember.Object.create({
                        isNew: false,
                        title: '(Untitled)'
                    }),
                    invoked: 0,
                    generateAndSetSlug() {
                        this.incrementProperty('invoked');
                    }
                });

                expect(controller.get('invoked')).to.equal(0);
                expect(controller.get('model.title')).to.equal('(Untitled)');

                run(function () {
                    controller.set('model.titleScratch', 'test');

                    controller.titleObserver();

                    // since titleObserver invokes generateAndSetSlug with a delay of 700ms
                    // we need to make sure this assertion runs after that.
                    // probably a better way to handle this?
                    run.later(function () {
                        expect(controller.get('invoked')).to.equal(1);

                        done();
                    }, 800);
                });
            });

            it('should not invoke generateAndSetSlug if the post is new but has a title', function (done) {
                let controller = this.subject({
                    model: Ember.Object.create({
                        isNew: true,
                        title: 'a title'
                    }),
                    invoked: 0,
                    generateAndSetSlug() {
                        this.incrementProperty('invoked');
                    }
                });

                expect(controller.get('invoked')).to.equal(0);
                expect(controller.get('model.title')).to.equal('a title');

                run(function () {
                    controller.set('model.titleScratch', 'test');

                    controller.titleObserver();

                    // since titleObserver invokes generateAndSetSlug with a delay of 700ms
                    // we need to make sure this assertion runs after that.
                    // probably a better way to handle this?
                    run.later(function () {
                        expect(controller.get('invoked')).to.equal(0);

                        done();
                    }, 800);
                });
            });
        });

        describe('updateSlug', function () {
            it('should reset slugValue to the previous slug when the new slug is blank or unchanged', function () {
                let controller = this.subject({
                    model: Ember.Object.create({
                        slug: 'slug'
                    })
                });

                run(function () {
                    // unchanged
                    controller.set('slugValue', 'slug');
                    controller.send('updateSlug', controller.get('slugValue'));

                    expect(controller.get('model.slug')).to.equal('slug');
                    expect(controller.get('slugValue')).to.equal('slug');
                });

                run(function () {
                    // unchanged after trim
                    controller.set('slugValue', 'slug  ');
                    controller.send('updateSlug', controller.get('slugValue'));

                    expect(controller.get('model.slug')).to.equal('slug');
                    expect(controller.get('slugValue')).to.equal('slug');
                });

                run(function () {
                    // blank
                    controller.set('slugValue', '');
                    controller.send('updateSlug', controller.get('slugValue'));

                    expect(controller.get('model.slug')).to.equal('slug');
                    expect(controller.get('slugValue')).to.equal('slug');
                });
            });

            it('should not set a new slug if the server-generated slug matches existing slug', function (done) {
                let controller = this.subject({
                    slugGenerator: Ember.Object.create({
                        generateSlug(slugType, str) {
                            let promise = Ember.RSVP.resolve(str.split('#')[0]);
                            this.set('lastPromise', promise);
                            return promise;
                        }
                    }),
                    model: Ember.Object.create({
                        slug: 'whatever'
                    })
                });

                run(function () {
                    controller.set('slugValue', 'whatever#slug');
                    controller.send('updateSlug', controller.get('slugValue'));

                    Ember.RSVP.resolve(controller.get('lastPromise')).then(function () {
                        expect(controller.get('model.slug')).to.equal('whatever');

                        done();
                    }).catch(done);
                });
            });

            it('should not set a new slug if the only change is to the appended increment value', function (done) {
                let controller = this.subject({
                    slugGenerator: Ember.Object.create({
                        generateSlug(slugType, str) {
                            let sanitizedStr = str.replace(/[^a-zA-Z]/g, '');
                            let promise = Ember.RSVP.resolve(`${sanitizedStr}-2`);
                            this.set('lastPromise', promise);
                            return promise;
                        }
                    }),
                    model: Ember.Object.create({
                        slug: 'whatever'
                    })
                });

                run(function () {
                    controller.set('slugValue', 'whatever!');
                    controller.send('updateSlug', controller.get('slugValue'));

                    Ember.RSVP.resolve(controller.get('lastPromise')).then(function () {
                        expect(controller.get('model.slug')).to.equal('whatever');

                        done();
                    }).catch(done);
                });
            });

            it('should set the slug if the new slug is different', function (done) {
                let controller = this.subject({
                    slugGenerator: Ember.Object.create({
                        generateSlug(slugType, str) {
                            let promise = Ember.RSVP.resolve(str);
                            this.set('lastPromise', promise);
                            return promise;
                        }
                    }),
                    model: Ember.Object.create({
                        slug: 'whatever',
                        save: K
                    })
                });

                run(function () {
                    controller.set('slugValue', 'changed');
                    controller.send('updateSlug', controller.get('slugValue'));

                    Ember.RSVP.resolve(controller.get('lastPromise')).then(function () {
                        expect(controller.get('model.slug')).to.equal('changed');

                        done();
                    }).catch(done);
                });
            });

            it('should save the post when the slug changes and the post is not new', function (done) {
                let controller = this.subject({
                    slugGenerator: Ember.Object.create({
                        generateSlug(slugType, str) {
                            let promise = Ember.RSVP.resolve(str);
                            this.set('lastPromise', promise);
                            return promise;
                        }
                    }),
                    model: Ember.Object.create({
                        slug: 'whatever',
                        saved: 0,
                        isNew: false,
                        save() {
                            this.incrementProperty('saved');
                        }
                    })
                });

                run(function () {
                    controller.set('slugValue', 'changed');
                    controller.send('updateSlug', controller.get('slugValue'));

                    Ember.RSVP.resolve(controller.get('lastPromise')).then(function () {
                        expect(controller.get('model.slug')).to.equal('changed');
                        expect(controller.get('model.saved')).to.equal(1);

                        done();
                    }).catch(done);
                });
            });

            it('should not save the post when the slug changes and the post is new', function (done) {
                let controller = this.subject({
                    slugGenerator: Ember.Object.create({
                        generateSlug(slugType, str) {
                            let promise = Ember.RSVP.resolve(str);
                            this.set('lastPromise', promise);
                            return promise;
                        }
                    }),
                    model: Ember.Object.create({
                        slug: 'whatever',
                        saved: 0,
                        isNew: true,
                        save() {
                            this.incrementProperty('saved');
                        }
                    })
                });

                run(function () {
                    controller.set('slugValue', 'changed');
                    controller.send('updateSlug', controller.get('slugValue'));

                    Ember.RSVP.resolve(controller.get('lastPromise')).then(function () {
                        expect(controller.get('model.slug')).to.equal('changed');
                        expect(controller.get('model.saved')).to.equal(0);

                        done();
                    }).catch(done);
                });
            });
        });
    }
);
