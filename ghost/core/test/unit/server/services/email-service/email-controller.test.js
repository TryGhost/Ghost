const assert = require('node:assert/strict');
const EmailController = require('../../../../../core/server/services/email-service/email-controller');
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

        it('uses member_status from options', async function () {
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
            const {memberStatus} = await controller._getFrameData({
                options: {
                    id: 'options-id',
                    member_status: 'free'
                }
            });
            assert.equal(memberStatus, 'free');
        });

        it('uses member_status from data', async function () {
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
            const {memberStatus} = await controller._getFrameData({
                options: {
                    id: 'options-id'
                },
                data: {
                    member_status: 'paid'
                }
            });
            assert.equal(memberStatus, 'paid');
        });

        it('rejects an invalid member_status', async function () {
            const controller = new EmailController({}, {
                models: {
                    Post: createModelClass(),
                    Newsletter: createModelClass()
                }
            });
            await assert.rejects(controller._getFrameData({
                options: {
                    id: 'options-id',
                    member_status: 'comped'
                },
                data: {}
            }), {errorType: 'ValidationError'});
        });

        it('maps legacy memberSegment values onto member_status', async function () {
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
            const free = await controller._getFrameData({
                options: {
                    id: 'options-id',
                    memberSegment: 'status:free'
                }
            });
            assert.equal(free.memberStatus, 'free');

            const paid = await controller._getFrameData({
                options: {
                    id: 'options-id'
                },
                data: {
                    memberSegment: 'status:-free'
                }
            });
            assert.equal(paid.memberStatus, 'paid');
        });

        it('rejects an unknown legacy memberSegment', async function () {
            const controller = new EmailController({}, {
                models: {
                    Post: createModelClass(),
                    Newsletter: createModelClass()
                }
            });
            await assert.rejects(controller._getFrameData({
                options: {
                    id: 'options-id',
                    memberSegment: 'status:-free+product:\'gold\''
                },
                data: {}
            }), {errorType: 'ValidationError'});
        });

        it('prefers member_status over legacy memberSegment', async function () {
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
            const {memberStatus} = await controller._getFrameData({
                options: {
                    id: 'options-id',
                    member_status: 'free',
                    memberSegment: 'status:-free'
                }
            });
            assert.equal(memberStatus, 'free');
        });

        it('rejects a legacy memberSegment even when member_status is present', async function () {
            const controller = new EmailController({}, {
                models: {
                    Post: createModelClass(),
                    Newsletter: createModelClass()
                }
            });
            await assert.rejects(controller._getFrameData({
                options: {
                    id: 'options-id',
                    member_status: 'paid',
                    memberSegment: 'status:-free+product:\'gold\''
                },
                data: {}
            }), {errorType: 'ValidationError'});
        });

        it('rejects a non-string legacy memberSegment', async function () {
            const controller = new EmailController({}, {
                models: {
                    Post: createModelClass(),
                    Newsletter: createModelClass()
                }
            });
            // a single-element array would coerce to a valid object key
            await assert.rejects(controller._getFrameData({
                options: {
                    id: 'options-id',
                    memberSegment: ['status:free']
                },
                data: {}
            }), {errorType: 'ValidationError'});
        });

        it('rejects an empty member_tier', async function () {
            const controller = new EmailController({}, {
                models: {
                    Post: createModelClass(),
                    Newsletter: createModelClass()
                }
            });
            await assert.rejects(controller._getFrameData({
                options: {
                    id: 'options-id',
                    member_tier: ''
                },
                data: {}
            }), {errorType: 'ValidationError'});
        });

        it('rejects a non-string member_tier from options', async function () {
            const controller = new EmailController({}, {
                models: {
                    Post: createModelClass(),
                    Newsletter: createModelClass()
                }
            });
            await assert.rejects(controller._getFrameData({
                options: {
                    id: 'options-id',
                    member_tier: ['silver', 'gold']
                },
                data: {}
            }), {errorType: 'ValidationError'});
        });

        it('rejects a non-string member_tier from data', async function () {
            const controller = new EmailController({}, {
                models: {
                    Post: createModelClass(),
                    Newsletter: createModelClass()
                }
            });
            await assert.rejects(controller._getFrameData({
                options: {
                    id: 'options-id'
                },
                data: {
                    member_tier: {slug: 'gold'}
                }
            }), {errorType: 'ValidationError'});
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

        it('throw if more than one email is provided', async function () {
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
                    newsletter: 'newsletter-slug',
                    emails: ['example@example.com', 'example2@example.com']
                }
            }), /Too many emails provided. Maximum of 1 test email can be sent at once./);
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
