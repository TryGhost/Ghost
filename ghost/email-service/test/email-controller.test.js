const assert = require('assert/strict');
const EmailController = require('../lib/EmailController');
const {createModel, createModelClass} = require('./utils');

describe('Email Controller', function () {
    describe('_getFrameData', function () {
        it('uses options id to fetch post', async function () {
            const controller = new EmailController({}, {
                models: {
                    Post: createModelClass({
                        findOne: {
                            title: 'Post title',
                            newsletter: createModel({slug: 'post-newsletter'})
                        }
                    })
                }
            });
            const {post, newsletter} = await controller._getFrameData({
                options: {
                    id: 'options-id'
                },
                data: {}
            });
            assert.equal(post.id, 'options-id');
            assert.equal(newsletter.get('slug'), 'post-newsletter');
        });

        it('throws if post is not found', async function () {
            const controller = new EmailController({}, {
                models: {
                    Post: createModelClass({
                        findOne: null
                    })
                }
            });
            await assert.rejects(controller._getFrameData({
                options: {
                    id: 'options-id'
                },
                data: {}
            }), /Post not found/);
        });

        it('uses default newsletter if post has no newsletter', async function () {
            const controller = new EmailController({}, {
                models: {
                    Post: createModelClass({
                        findOne: {}
                    }),
                    Newsletter: createModelClass({
                        getDefaultNewsletter: () => {
                            return createModel({
                                slug: 'default-newsletter'
                            });
                        }
                    })
                }
            });
            const {newsletter} = await controller._getFrameData({
                options: {
                    id: 'options-id'
                },
                data: {}
            });
            assert.equal(newsletter.get('slug'), 'default-newsletter');
        });

        it('uses newsletter from options', async function () {
            const controller = new EmailController({}, {
                models: {
                    Post: createModelClass(),
                    Newsletter: createModelClass()
                }
            });
            const {newsletter} = await controller._getFrameData({
                options: {
                    id: 'options-id',
                    newsletter: 'my-newsletter'
                },
                data: {}
            });
            assert.equal(newsletter.get('slug'), 'my-newsletter');
        });

        it('uses post from data', async function () {
            const controller = new EmailController({}, {
                models: {
                    Post: createModelClass({
                        findOne: {
                            newsletter: createModel({slug: 'post-newsletter'})
                        }
                    }),
                    Newsletter: createModelClass()
                }
            });
            const {post} = await controller._getFrameData({
                options: {},
                data: {
                    slug: 'my-post'
                }
            });
            assert.equal(post.get('slug'), 'my-post');
        });

        it('uses segment from options', async function () {
            const controller = new EmailController({}, {
                models: {
                    Post: createModelClass({
                        findOne: {
                            newsletter: createModel({slug: 'post-newsletter'})
                        }
                    }),
                    Newsletter: createModelClass()
                }
            });
            const {segment} = await controller._getFrameData({
                options: {
                    id: 'options-id',
                    memberSegment: 'free'
                }
            });
            assert.equal(segment, 'free');
        });

        it('uses segment from data', async function () {
            const controller = new EmailController({}, {
                models: {
                    Post: createModelClass({
                        findOne: {
                            newsletter: createModel({slug: 'post-newsletter'})
                        }
                    }),
                    Newsletter: createModelClass()
                }
            });
            const {segment} = await controller._getFrameData({
                options: {
                    id: 'options-id'
                },
                data: {
                    memberSegment: 'free'
                }
            });
            assert.equal(segment, 'free');
        });
    });

    describe('previewEmail', function () {
        it('should return preview email', async function () {
            const service = {
                previewEmail: (post) => {
                    return {html: 'html', plainText: 'text', subject: post.get('title')};
                }
            };

            const controller = new EmailController(service, {
                models: {
                    Post: createModelClass({
                        findOne: {
                            title: 'Post title'
                        }
                    }),
                    Newsletter: createModelClass()
                }
            });
            const result = await controller.previewEmail({
                options: {},
                data: {
                    id: '123',
                    newsletter: 'newsletter-slug'
                }
            });
            assert.equal(result.html, 'html');
            assert.equal(result.plainText, 'text');
            assert.equal(result.subject, 'Post title');
        });
    });

    describe('sendTestEmail', function () {
        it('throws if emails is missing', async function () {
            const service = {
                sendTestEmail: () => {
                    return Promise.resolve({id: 'mail@id'});
                }
            };

            const controller = new EmailController(service, {
                models: {
                    Post: createModelClass({
                        findOne: {
                            title: 'Post title'
                        }
                    }),
                    Newsletter: createModelClass()
                }
            });
            await assert.rejects(controller.sendTestEmail({
                options: {},
                data: {
                    id: '123',
                    newsletter: 'newsletter-slug'
                }
            }), /No emails provided/);
        });

        it('returns undefined', async function () {
            const service = {
                sendTestEmail: () => {
                    return Promise.resolve({id: 'mail@id'});
                }
            };

            const controller = new EmailController(service, {
                models: {
                    Post: createModelClass({
                        findOne: {
                            title: 'Post title'
                        }
                    }),
                    Newsletter: createModelClass()
                }
            });
            const result = await controller.sendTestEmail({
                options: {},
                data: {
                    id: '123',
                    newsletter: 'newsletter-slug',
                    emails: ['example@example.com']
                }
            });
            assert.equal(result, undefined);
        });
    });

    describe('retryFailedEmail', function () {
        it('throws if email not found', async function () {
            const controller = new EmailController({}, {
                models: {
                    Email: createModelClass({
                        findOne: null
                    })
                }
            });
            await assert.rejects(controller.retryFailedEmail({
                options: {},
                data: {
                    id: '123'
                }
            }), /Email not found/);
        });

        it('returns email', async function () {
            const service = {
                retryEmail: (email) => {
                    return Promise.resolve(email);
                }
            };

            const controller = new EmailController(service, {
                models: {
                    Email: createModelClass({
                        findOne: {
                            status: 'failed'
                        }
                    })
                }
            });
            const result = await controller.retryFailedEmail({
                options: {},
                data: {
                    id: '123'
                }
            });
            assert.equal(result.get('status'), 'failed');
        });
    });
});
