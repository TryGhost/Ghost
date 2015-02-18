import Ember from 'ember';
import {
    describeModule,
    it
} from 'ember-mocha';

describeModule(
    'controller:post-settings-menu',
    {
        needs: ['controller:application']
    },

    function () {
        it('slugValue is one-way bound to model.slug', function () {
            var controller = this.subject({
                model: Ember.Object.create({
                    slug: 'a-slug'
                })
            });

            expect(controller.get('model.slug')).to.equal('a-slug');
            expect(controller.get('slugValue')).to.equal('a-slug');

            Ember.run(function () {
                controller.set('model.slug', 'changed-slug');

                expect(controller.get('slugValue')).to.equal('changed-slug');
            });

            Ember.run(function () {
                controller.set('slugValue', 'changed-directly');

                expect(controller.get('model.slug')).to.equal('changed-slug');
                expect(controller.get('slugValue')).to.equal('changed-directly');
            });

            Ember.run(function () {
                // test that the one-way binding is still in place
                controller.set('model.slug', 'should-update');

                expect(controller.get('slugValue')).to.equal('should-update');
            });
        });

        it('metaTitleScratch is one-way bound to model.meta_title', function () {
            var controller = this.subject({
                model: Ember.Object.create({
                    meta_title: 'a title'
                })
            });

            expect(controller.get('model.meta_title')).to.equal('a title');
            expect(controller.get('metaTitleScratch')).to.equal('a title');

            Ember.run(function () {
                controller.set('model.meta_title', 'a different title');

                expect(controller.get('metaTitleScratch')).to.equal('a different title');
            });

            Ember.run(function () {
                controller.set('metaTitleScratch', 'changed directly');

                expect(controller.get('model.meta_title')).to.equal('a different title');
                expect(controller.get('metaTitleScratch')).to.equal('changed directly');
            });

            Ember.run(function () {
                // test that the one-way binding is still in place
                controller.set('model.meta_title', 'should update');

                expect(controller.get('metaTitleScratch')).to.equal('should update');
            });
        });

        it('metaDescriptionScratch is one-way bound to model.meta_description', function () {
            var controller = this.subject({
                model: Ember.Object.create({
                    meta_description: 'a description'
                })
            });

            expect(controller.get('model.meta_description')).to.equal('a description');
            expect(controller.get('metaDescriptionScratch')).to.equal('a description');

            Ember.run(function () {
                controller.set('model.meta_description', 'a different description');

                expect(controller.get('metaDescriptionScratch')).to.equal('a different description');
            });

            Ember.run(function () {
                controller.set('metaDescriptionScratch', 'changed directly');

                expect(controller.get('model.meta_description')).to.equal('a different description');
                expect(controller.get('metaDescriptionScratch')).to.equal('changed directly');
            });

            Ember.run(function () {
                // test that the one-way binding is still in place
                controller.set('model.meta_description', 'should update');

                expect(controller.get('metaDescriptionScratch')).to.equal('should update');
            });
        });

        describe('seoTitle', function () {
            it('should be the meta_title if one exists', function () {
                var controller = this.subject({
                    model: Ember.Object.create({
                        meta_title: 'a meta-title',
                        titleScratch: 'should not be used'
                    })
                });

                expect(controller.get('seoTitle')).to.equal('a meta-title');
            });

            it('should default to the title if an explicit meta-title does not exist', function () {
                var controller = this.subject({
                    model: Ember.Object.create({
                        titleScratch: 'should be the meta-title'
                    })
                });

                expect(controller.get('seoTitle')).to.equal('should be the meta-title');
            });

            it('should be the meta_title if both title and meta_title exist', function () {
                var controller = this.subject({
                    model: Ember.Object.create({
                        meta_title: 'a meta-title',
                        titleScratch: 'a title'
                    })
                });

                expect(controller.get('seoTitle')).to.equal('a meta-title');
            });

            it('should revert to the title if explicit meta_title is removed', function () {
                var controller = this.subject({
                    model: Ember.Object.create({
                        meta_title: 'a meta-title',
                        titleScratch: 'a title'
                    })
                });

                expect(controller.get('seoTitle')).to.equal('a meta-title');

                Ember.run(function () {
                    controller.set('model.meta_title', '');

                    expect(controller.get('seoTitle')).to.equal('a title');
                });
            });

            it('should truncate to 70 characters with an appended ellipsis', function () {
                var longTitle,
                    controller;

                longTitle = new Array(100).join('a');
                expect(longTitle.length).to.equal(99);

                controller = this.subject({
                    model: Ember.Object.create()
                });

                Ember.run(function () {
                    var expected = longTitle.substr(0, 70) + '&hellip;';

                    controller.set('metaTitleScratch', longTitle);

                    expect(controller.get('seoTitle').toString().length).to.equal(78);
                    expect(controller.get('seoTitle').toString()).to.equal(expected);
                });
            });
        });

        describe('seoDescription', function () {
            it('should be the meta_description if one exists', function () {
                var controller = this.subject({
                    model: Ember.Object.create({
                        meta_description: 'a description'
                    })
                });

                expect(controller.get('seoDescription')).to.equal('a description');
            });

            it.skip('should be generated from the rendered markdown if not explicitly set', function () {
                // can't test right now because the rendered markdown is being pulled
                // from the DOM via jquery
            });

            it('should truncate to 156 characters with an appended ellipsis', function () {
                var longDescription,
                    controller;

                longDescription = new Array(200).join('a');
                expect(longDescription.length).to.equal(199);

                controller = this.subject({
                    model: Ember.Object.create()
                });

                Ember.run(function () {
                    var expected = longDescription.substr(0, 156) + '&hellip;';

                    controller.set('metaDescriptionScratch', longDescription);

                    expect(controller.get('seoDescription').toString().length).to.equal(164);
                    expect(controller.get('seoDescription').toString()).to.equal(expected);
                });
            });
        });

        describe('seoURL', function () {
            it('should be the URL of the blog if no post slug exists', function () {
                var controller = this.subject({
                    config: Ember.Object.create({blogUrl: 'http://my-ghost-blog.com'}),
                    model: Ember.Object.create()
                });

                expect(controller.get('seoURL')).to.equal('http://my-ghost-blog.com/');
            });

            it('should be the URL of the blog plus the post slug', function () {
                var controller = this.subject({
                    config: Ember.Object.create({blogUrl: 'http://my-ghost-blog.com'}),
                    model: Ember.Object.create({slug: 'post-slug'})
                });

                expect(controller.get('seoURL')).to.equal('http://my-ghost-blog.com/post-slug/');
            });

            it('should update when the post slug changes', function () {
                var controller = this.subject({
                    config: Ember.Object.create({blogUrl: 'http://my-ghost-blog.com'}),
                    model: Ember.Object.create({slug: 'post-slug'})
                });

                expect(controller.get('seoURL')).to.equal('http://my-ghost-blog.com/post-slug/');

                Ember.run(function () {
                    controller.set('model.slug', 'changed-slug');

                    expect(controller.get('seoURL')).to.equal('http://my-ghost-blog.com/changed-slug/');
                });
            });

            it('should truncate a long URL to 70 characters with an appended ellipsis', function () {
                var longSlug,
                    blogURL = 'http://my-ghost-blog.com',
                    expected,
                    controller;

                longSlug = new Array(75).join('a');
                expect(longSlug.length).to.equal(74);

                controller = this.subject({
                    config: Ember.Object.create({blogUrl: blogURL}),
                    model: Ember.Object.create({slug: longSlug})
                });

                expected = blogURL + '/' + longSlug + '/';
                expected = expected.substr(0, 70) + '&hellip;';

                expect(controller.get('seoURL').toString().length).to.equal(78);
                expect(controller.get('seoURL').toString()).to.equal(expected);
            });
        });

        describe('togglePage', function () {
            it('should toggle the page property', function () {
                var controller = this.subject({
                    model: Ember.Object.create({
                        page: false,
                        isNew: true
                    })
                });

                expect(controller.get('model.page')).to.not.be.ok;

                Ember.run(function () {
                    controller.send('togglePage');

                    expect(controller.get('model.page')).to.be.ok;
                });
            });

            it('should not save the post if it is still new', function () {
                var controller = this.subject({
                    model: Ember.Object.create({
                        page: false,
                        isNew: true,
                        save: function () {
                            this.incrementProperty('saved');
                            return Ember.RSVP.resolve();
                        }
                    })
                });

                Ember.run(function () {
                    controller.send('togglePage');

                    expect(controller.get('model.page')).to.be.ok;
                    expect(controller.get('model.saved')).to.not.be.ok;
                });
            });

            it('should save the post if it is not new', function () {
                var controller = this.subject({
                    model: Ember.Object.create({
                        page: false,
                        isNew: false,
                        save: function () {
                            this.incrementProperty('saved');
                            return Ember.RSVP.resolve();
                        }
                    })
                });

                Ember.run(function () {
                    controller.send('togglePage');

                    expect(controller.get('model.page')).to.be.ok;
                    expect(controller.get('model.saved')).to.equal(1);
                });
            });
        });

        describe('toggleFeatured', function () {
            it('should toggle the featured property', function () {
                var controller = this.subject({
                    model: Ember.Object.create({
                        featured: false,
                        isNew: true
                    })
                });

                Ember.run(function () {
                    controller.send('toggleFeatured');

                    expect(controller.get('model.featured')).to.be.ok;
                });
            });

            it('should not save the post if it is still new', function () {
                var controller = this.subject({
                    model: Ember.Object.create({
                        featured: false,
                        isNew: true,
                        save: function () {
                            this.incrementProperty('saved');
                            return Ember.RSVP.resolve();
                        }
                    })
                });

                Ember.run(function () {
                    controller.send('toggleFeatured');

                    expect(controller.get('model.featured')).to.be.ok;
                    expect(controller.get('model.saved')).to.not.be.ok;
                });
            });

            it('should save the post if it is not new', function () {
                var controller = this.subject({
                    model: Ember.Object.create({
                        featured: false,
                        isNew: false,
                        save: function () {
                            this.incrementProperty('saved');
                            return Ember.RSVP.resolve();
                        }
                    })
                });

                Ember.run(function () {
                    controller.send('toggleFeatured');

                    expect(controller.get('model.featured')).to.be.ok;
                    expect(controller.get('model.saved')).to.equal(1);
                });
            });
        });

        describe('generateAndSetSlug', function () {
            it('should generate a slug and set it on the destination', function (done) {
                var controller = this.subject({
                    slugGenerator: Ember.Object.create({
                        generateSlug: function (str) {
                            return Ember.RSVP.resolve(str + '-slug');
                        }
                    }),
                    model: Ember.Object.create({slug: ''})
                });

                Ember.run(function () {
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
                var controller = this.subject({
                    slugGenerator: Ember.Object.create({
                        generateSlug: function (str) {
                            return Ember.RSVP.resolve(str + '-slug');
                        }
                    }),
                    model: Ember.Object.create({
                        slug: 'whatever'
                    })
                });

                expect(controller.get('model.slug')).to.equal('whatever');

                Ember.run(function () {
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
                var controller = this.subject({
                    model: Ember.Object.create({isNew: true}),
                    invoked: 0,
                    generateAndSetSlug: function () {
                        this.incrementProperty('invoked');
                    }
                });

                expect(controller.get('invoked')).to.equal(0);
                expect(controller.get('model.title')).to.not.be.ok;

                Ember.run(function () {
                    controller.set('model.titleScratch', 'test');

                    controller.titleObserver();

                    // since titleObserver invokes generateAndSetSlug with a delay of 700ms
                    // we need to make sure this assertion runs after that.
                    // probably a better way to handle this?
                    Ember.run.later(function () {
                        expect(controller.get('invoked')).to.equal(1);

                        done();
                    }, 800);
                });
            });

            it('should invoke generateAndSetSlug if the post title is "(Untitled)"', function (done) {
                var controller = this.subject({
                    model: Ember.Object.create({
                        isNew: false,
                        title: '(Untitled)'
                    }),
                    invoked: 0,
                    generateAndSetSlug: function () {
                        this.incrementProperty('invoked');
                    }
                });

                expect(controller.get('invoked')).to.equal(0);
                expect(controller.get('model.title')).to.equal('(Untitled)');

                Ember.run(function () {
                    controller.set('model.titleScratch', 'test');

                    controller.titleObserver();

                    // since titleObserver invokes generateAndSetSlug with a delay of 700ms
                    // we need to make sure this assertion runs after that.
                    // probably a better way to handle this?
                    Ember.run.later(function () {
                        expect(controller.get('invoked')).to.equal(1);

                        done();
                    }, 800);
                });
            });

            it('should not invoke generateAndSetSlug if the post is new but has a title', function (done) {
                var controller = this.subject({
                    model: Ember.Object.create({
                        isNew: true,
                        title: 'a title'
                    }),
                    invoked: 0,
                    generateAndSetSlug: function () {
                        this.incrementProperty('invoked');
                    }
                });

                expect(controller.get('invoked')).to.equal(0);
                expect(controller.get('model.title')).to.equal('a title');

                Ember.run(function () {
                    controller.set('model.titleScratch', 'test');

                    controller.titleObserver();

                    // since titleObserver invokes generateAndSetSlug with a delay of 700ms
                    // we need to make sure this assertion runs after that.
                    // probably a better way to handle this?
                    Ember.run.later(function () {
                        expect(controller.get('invoked')).to.equal(0);

                        done();
                    }, 800);
                });
            });
        });

        describe('updateSlug', function () {
            it('should reset slugValue to the previous slug when the new slug is blank or unchanged', function () {
                var controller = this.subject({
                    model: Ember.Object.create({
                        slug: 'slug'
                    })
                });

                Ember.run(function () {
                    // unchanged
                    controller.set('slugValue', 'slug');
                    controller.send('updateSlug', controller.get('slugValue'));

                    expect(controller.get('model.slug')).to.equal('slug');
                    expect(controller.get('slugValue')).to.equal('slug');
                });

                Ember.run(function () {
                    // unchanged after trim
                    controller.set('slugValue', 'slug  ');
                    controller.send('updateSlug', controller.get('slugValue'));

                    expect(controller.get('model.slug')).to.equal('slug');
                    expect(controller.get('slugValue')).to.equal('slug');
                });

                Ember.run(function () {
                    // blank
                    controller.set('slugValue', '');
                    controller.send('updateSlug', controller.get('slugValue'));

                    expect(controller.get('model.slug')).to.equal('slug');
                    expect(controller.get('slugValue')).to.equal('slug');
                });
            });

            it('should not set a new slug if the server-generated slug matches existing slug', function (done) {
                var controller = this.subject({
                    slugGenerator: Ember.Object.create({
                        generateSlug: function (str) {
                            var promise;
                            promise = Ember.RSVP.resolve(str.split('#')[0]);
                            this.set('lastPromise', promise);
                            return promise;
                        }
                    }),
                    model: Ember.Object.create({
                        slug: 'whatever'
                    })
                });

                Ember.run(function () {
                    controller.set('slugValue', 'whatever#slug');
                    controller.send('updateSlug', controller.get('slugValue'));

                    Ember.RSVP.resolve(controller.get('lastPromise')).then(function () {
                        expect(controller.get('model.slug')).to.equal('whatever');

                        done();
                    }).catch(done);
                });
            });

            it('should not set a new slug if the only change is to the appended increment value', function (done) {
                var controller = this.subject({
                    slugGenerator: Ember.Object.create({
                        generateSlug: function (str) {
                            var promise;
                            promise = Ember.RSVP.resolve(str.replace(/[^a-zA-Z]/g, '') + '-2');
                            this.set('lastPromise', promise);
                            return promise;
                        }
                    }),
                    model: Ember.Object.create({
                        slug: 'whatever'
                    })
                });

                Ember.run(function () {
                    controller.set('slugValue', 'whatever!');
                    controller.send('updateSlug', controller.get('slugValue'));

                    Ember.RSVP.resolve(controller.get('lastPromise')).then(function () {
                        expect(controller.get('model.slug')).to.equal('whatever');

                        done();
                    }).catch(done);
                });
            });

            it('should set the slug if the new slug is different', function (done) {
                var controller = this.subject({
                    slugGenerator: Ember.Object.create({
                        generateSlug: function (str) {
                            var promise;
                            promise = Ember.RSVP.resolve(str);
                            this.set('lastPromise', promise);
                            return promise;
                        }
                    }),
                    model: Ember.Object.create({
                        slug: 'whatever',
                        save: Ember.K
                    })
                });

                Ember.run(function () {
                    controller.set('slugValue', 'changed');
                    controller.send('updateSlug', controller.get('slugValue'));

                    Ember.RSVP.resolve(controller.get('lastPromise')).then(function () {
                        expect(controller.get('model.slug')).to.equal('changed');

                        done();
                    }).catch(done);
                });
            });

            it('should save the post when the slug changes and the post is not new', function (done) {
                var controller = this.subject({
                    slugGenerator: Ember.Object.create({
                        generateSlug: function (str) {
                            var promise;
                            promise = Ember.RSVP.resolve(str);
                            this.set('lastPromise', promise);
                            return promise;
                        }
                    }),
                    model: Ember.Object.create({
                        slug: 'whatever',
                        saved: 0,
                        isNew: false,
                        save: function () {
                            this.incrementProperty('saved');
                        }
                    })
                });

                Ember.run(function () {
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
                var controller = this.subject({
                    slugGenerator: Ember.Object.create({
                        generateSlug: function (str) {
                            var promise;
                            promise = Ember.RSVP.resolve(str);
                            this.set('lastPromise', promise);
                            return promise;
                        }
                    }),
                    model: Ember.Object.create({
                        slug: 'whatever',
                        saved: 0,
                        isNew: true,
                        save: function () {
                            this.incrementProperty('saved');
                        }
                    })
                });

                Ember.run(function () {
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
