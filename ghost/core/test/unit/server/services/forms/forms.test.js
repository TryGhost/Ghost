const assert = require('assert/strict');
const sinon = require('sinon');
const formsService = require('../../../../../core/server/services/forms');
const models = require('../../../../../core/server/models');
const errors = require('@tryghost/errors');

describe('Forms Service', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('getPublicForm', function () {
        it('throws NotFoundError if form not found', async function () {
            sinon.stub(models.Form, 'findOne').resolves(null);

            await assert.rejects(
                async () => {
                    await formsService.getPublicForm({id: 'nonexistent'});
                },
                (err) => {
                    assert(err instanceof errors.NotFoundError);
                    return true;
                }
            );
        });

        it('throws NotFoundError if form is inactive', async function () {
            sinon.stub(models.Form, 'findOne').resolves({
                get(key) {
                    if (key === 'status') {
                        return 'archived';
                    }
                    return null;
                }
            });

            await assert.rejects(
                async () => {
                    await formsService.getPublicForm({id: 'form_1'});
                },
                (err) => {
                    assert(err instanceof errors.NotFoundError);
                    return true;
                }
            );
        });

        it('returns public fields if form is active', async function () {
            sinon.stub(models.Form, 'findOne').resolves({
                get(key) {
                    const data = {
                        id: 'form_1',
                        name: 'Contact Form',
                        description: 'Get in touch',
                        status: 'active',
                        schema: JSON.stringify({fields: [{id: 'name', label: 'Name', type: 'text'}]})
                    };
                    return data[key];
                }
            });

            const res = await formsService.getPublicForm({id: 'form_1'});
            assert.equal(res.id, 'form_1');
            assert.equal(res.name, 'Contact Form');
            assert.equal(res.description, 'Get in touch');
            assert(res.schema.includes('Contact Form') === false);
        });
    });

    describe('submitForm', function () {
        it('throws ValidationError if a required field is missing', async function () {
            sinon.stub(models.Form, 'findOne').resolves({
                id: 'form_1',
                get(key) {
                    if (key === 'status') {
                        return 'active';
                    }
                    if (key === 'schema') {
                        return JSON.stringify({
                            fields: [
                                {id: 'email', label: 'Email', required: true}
                            ]
                        });
                    }
                    return null;
                }
            });

            await assert.rejects(
                async () => {
                    await formsService.submitForm('form_1', {name: 'Alice'});
                },
                (err) => {
                    assert(err instanceof errors.ValidationError);
                    assert(err.message.includes('Email'));
                    return true;
                }
            );
        });

        it('saves submission if valid data is provided', async function () {
            sinon.stub(models.Form, 'findOne').resolves({
                id: 'form_1',
                get(key) {
                    if (key === 'status') {
                        return 'active';
                    }
                    if (key === 'schema') {
                        return JSON.stringify({
                            fields: [
                                {id: 'email', label: 'Email', required: true}
                            ]
                        });
                    }
                    return null;
                }
            });

            const addStub = sinon.stub(models.FormSubmission, 'add').resolves({
                id: 'sub_1',
                get: key => (key === 'id' ? 'sub_1' : null)
            });

            const result = await formsService.submitForm('form_1', {email: 'alice@example.com'});
            assert.equal(result.id, 'sub_1');
            assert(addStub.calledOnce);
            assert.equal(addStub.firstCall.args[0].form_id, 'form_1');
        });

        it('silently filters out bot submissions when honeypot field is filled', async function () {
            sinon.stub(models.Form, 'findOne').resolves({
                id: 'form_hp',
                get(key) {
                    if (key === 'status') {
                        return 'active';
                    }
                    if (key === 'schema') {
                        return JSON.stringify({fields: [{id: 'name', label: 'Name'}]});
                    }
                    return null;
                }
            });

            const addStub = sinon.stub(models.FormSubmission, 'add');

            const result = await formsService.submitForm('form_hp', {name: 'SpamBot', _hp: 'spam-link-payload'});
            assert.equal(result.id, 'bot_filtered');
            assert.equal(addStub.called, false);
        });

        it('rejects submission exceeding maximum field limit', async function () {
            sinon.stub(models.Form, 'findOne').resolves({
                id: 'form_overflow',
                get(key) {
                    if (key === 'status') {
                        return 'active';
                    }
                    if (key === 'schema') {
                        return JSON.stringify({fields: []});
                    }
                    return null;
                }
            });

            const excessData = {};
            for (let i = 0; i < 55; i++) {
                excessData[`field_${i}`] = `value_${i}`;
            }

            await assert.rejects(
                async () => {
                    await formsService.submitForm('form_overflow', excessData);
                },
                (err) => {
                    assert(err instanceof errors.BadRequestError);
                    assert(err.message.includes('Too many fields'));
                    return true;
                }
            );
        });

        it('rejects submission exceeding maximum payload length', async function () {
            sinon.stub(models.Form, 'findOne').resolves({
                id: 'form_huge',
                get(key) {
                    if (key === 'status') {
                        return 'active';
                    }
                    if (key === 'schema') {
                        return JSON.stringify({fields: []});
                    }
                    return null;
                }
            });

            const hugePayload = 'a'.repeat(100001);

            await assert.rejects(
                async () => {
                    await formsService.submitForm('form_huge', hugePayload);
                },
                (err) => {
                    assert(err instanceof errors.BadRequestError);
                    assert(err.message.includes('maximum allowed size'));
                    return true;
                }
            );
        });
    });

    describe('exportSubmissionsCSV', function () {
        it('generates valid CSV with headers and row data', async function () {
            sinon.stub(models.Form, 'findOne').resolves({
                id: 'form_1',
                get(key) {
                    if (key === 'schema') {
                        return JSON.stringify({
                            fields: [
                                {id: 'email', label: 'Email Address'},
                                {id: 'message', label: 'Message'}
                            ]
                        });
                    }
                    return null;
                }
            });

            sinon.stub(models.FormSubmission, 'findAll').resolves([
                {
                    get(key) {
                        if (key === 'id') {
                            return 'sub_1';
                        }
                        if (key === 'created_at') {
                            return new Date('2026-09-13T10:00:00.000Z');
                        }
                        if (key === 'data') {
                            return JSON.stringify({email: 'test@example.com', message: 'Hello World'});
                        }
                        return null;
                    }
                }
            ]);

            const csv = await formsService.exportSubmissionsCSV('form_1');
            assert(csv.includes('Submission ID'));
            assert(csv.includes('Email Address'));
            assert(csv.includes('test@example.com'));
            assert(csv.includes('Hello World'));
        });

        it('disarms spreadsheet formula injection attempts in cell values', async function () {
            sinon.stub(models.Form, 'findOne').resolves({
                id: 'form_csv_sec',
                get(key) {
                    if (key === 'schema') {
                        return JSON.stringify({
                            fields: [
                                {id: 'calc', label: 'Formula'},
                                {id: 'note', label: 'Note'}
                            ]
                        });
                    }
                    return null;
                }
            });

            sinon.stub(models.FormSubmission, 'findAll').resolves([
                {
                    get(key) {
                        if (key === 'id') {
                            return 'sub_sec';
                        }
                        if (key === 'created_at') {
                            return new Date('2026-09-13T10:00:00.000Z');
                        }
                        if (key === 'data') {
                            return JSON.stringify({
                                calc: '=cmd|\' /C calc\'!A0',
                                note: '@SUM(1+1)'
                            });
                        }
                        return null;
                    }
                }
            ]);

            const csv = await formsService.exportSubmissionsCSV('form_csv_sec');
            assert(csv.includes('\'=cmd|\' /C calc\'!A0'));
            assert(csv.includes('\'@SUM(1+1)'));
        });
    });

    describe('generateEmbedScript', function () {
        it('returns cleanup DOM script if form is inactive or deleted', async function () {
            sinon.stub(models.Form, 'findOne').resolves(null);

            const script = await formsService.generateEmbedScript('form_deleted');
            assert(script.includes('data-ghost-form="form_deleted"'));
            assert(script.includes('el.remove()'));
        });

        it('returns active loader script with custom CSS and AJAX submission', async function () {
            sinon.stub(models.Form, 'findOne').resolves({
                get(key) {
                    if (key === 'status') {
                        return 'active';
                    }
                    if (key === 'name') {
                        return 'Newsletter Signup';
                    }
                    if (key === 'schema') {
                        return JSON.stringify({
                            custom_css: '.ghost-form-container { border-radius: 20px; }',
                            fields: [{id: 'email', label: 'Email', type: 'email', required: true}]
                        });
                    }
                    return null;
                }
            });

            const script = await formsService.generateEmbedScript('form_active');
            assert(script.includes('Newsletter Signup'));
            assert(script.includes('.ghost-form-container { border-radius: 20px; }'));
            assert(script.includes('/ghost/api/content/forms/\' + formId + \'/submissions'));
        });

        it('supports all field types including radio, rating, phone, url, date, time', async function () {
            sinon.stub(models.Form, 'findOne').resolves({
                get(key) {
                    if (key === 'status') {
                        return 'active';
                    }
                    if (key === 'name') {
                        return 'Comprehensive Feedback';
                    }
                    if (key === 'schema') {
                        return JSON.stringify({
                            fields: [
                                {id: 'phone', label: 'Phone', type: 'phone'},
                                {id: 'website', label: 'Website', type: 'url'},
                                {id: 'booking_date', label: 'Date', type: 'date'},
                                {id: 'booking_time', label: 'Time', type: 'time'},
                                {id: 'choice', label: 'Choice', type: 'radio', options: ['Option A', 'Option B']},
                                {id: 'score', label: 'Rating', type: 'rating'}
                            ]
                        });
                    }
                    return null;
                }
            });

            const script = await formsService.generateEmbedScript('form_types');
            assert(script.includes('Comprehensive Feedback'));
            assert(script.includes('"type":"phone"'));
            assert(script.includes('"type":"url"'));
            assert(script.includes('"type":"date"'));
            assert(script.includes('"type":"time"'));
            assert(script.includes('inputType = \'tel\';'));
            assert(script.includes('ghost-form-radio'));
            assert(script.includes('ghost-rating-radio'));
            assert(script.includes('ghost-rating-star'));
            assert(script.includes('.ghost-rating-star:hover'));
            assert(script.includes('ghost-form-success'));
            assert(script.includes('celebrationSvg'));
            assert(script.includes('ghost-form-reset'));
        });

        it('strips dangerous CSS expressions and tags to prevent XSS breakout in embed script', async function () {
            sinon.stub(models.Form, 'findOne').resolves({
                get(key) {
                    if (key === 'status') {
                        return 'active';
                    }
                    if (key === 'schema') {
                        return JSON.stringify({
                            custom_css: '</style><script>alert("xss")</script>@import url("evil.css"); behavior: url(x); expression(alert(1)); url(javascript:alert(1)); url(data:text/css;base64,123);',
                            fields: []
                        });
                    }
                    return null;
                }
            });

            const script = await formsService.generateEmbedScript('form_sec');
            assert(!script.includes('<script>alert("xss")</script>'));
            assert(!script.includes('@import'));
            assert(!script.includes('behavior:'));
            assert(!script.includes('expression('));
            assert(!script.includes('javascript:alert(1)'));
            assert(!script.includes('url(data:'));
        });
    });

    describe('renderFormHtmlMarkup', function () {
        it('renders HTML with radio, rating, phone, url, date, time and star styling', function () {
            const form = {
                id: 'form_123',
                name: 'Customer Survey',
                description: 'We appreciate your thoughts',
                schema: JSON.stringify({
                    fields: [
                        {id: 'phone_1', name: 'phone', label: 'Phone', type: 'phone', required: true},
                        {id: 'url_1', name: 'website', label: 'Website', type: 'url'},
                        {id: 'date_1', name: 'date', label: 'Date', type: 'date'},
                        {id: 'time_1', name: 'time', label: 'Time', type: 'time'},
                        {id: 'radio_1', name: 'satisfaction', label: 'Satisfied?', type: 'radio', options: ['Yes', 'No']},
                        {id: 'rating_1', name: 'rating', label: 'Overall Rating', type: 'rating'}
                    ],
                    success_title: 'Submission Received!',
                    success_message: 'Thanks for letting us know your feedback.'
                })
            };

            const html = formsService.renderFormHtmlMarkup(form, 'form_123');
            assert(html.includes('data-ghost-form="form_123"'));
            assert(html.includes('Customer Survey'));
            assert(html.includes('We appreciate your thoughts'));
            assert(html.includes('type="tel"'));
            assert(html.includes('type="url"'));
            assert(html.includes('type="date"'));
            assert(html.includes('type="time"'));
            assert(html.includes('type="radio"'));
            assert(html.includes('ghost-rating-radio'));
            assert(html.includes('ghost-rating-star'));
            assert(html.includes('.ghost-rating-star:hover'));
            assert(html.includes('name="satisfaction" value="Yes"'));
            assert(html.includes('name="satisfaction" value="No"'));
            assert(html.includes('name="rating" value="5"'));
            assert(html.includes('name="rating" value="1"'));
            assert(html.includes('ghost-form-success'));
            assert(html.includes('Submission Received!'));
            assert(html.includes('Thanks for letting us know your feedback.'));
            assert(html.includes('Submit another response'));
            assert(html.includes('<svg width="140" height="140" viewBox="0 0 200 200"'));
        });

        it('renders default success title and message when none specified in schema', function () {
            const form = {
                id: 'form_defaults',
                name: 'Default Form',
                schema: JSON.stringify({fields: []})
            };

            const html = formsService.renderFormHtmlMarkup(form, 'form_defaults');
            assert(html.includes('Your form was successfully submitted!'));
            assert(html.includes('Thank you! Your response has been recorded.'));
            assert(html.includes('ghost-form-body-form_defaults'));
            assert(html.includes('ghost-form-success-form_defaults'));
        });

        it('renders hidden inert placeholder when form status is archived', function () {
            const form = {
                id: 'form_archived_1',
                name: 'Archived Survey',
                status: 'archived',
                schema: JSON.stringify({
                    fields: [{id: 'name', label: 'Name', type: 'text'}]
                })
            };

            const html = formsService.renderFormHtmlMarkup(form, 'form_archived_1');
            assert(html.includes('data-ghost-form="form_archived_1"'));
            assert(html.includes('class="ghost-form-archived"'));
            assert(html.includes('style="display: none;"'));
            assert(html.includes('aria-hidden="true"'));
            assert(html.includes('/ghost/api/content/forms/form_archived_1/embed.js'));
            assert(!html.includes('Archived Survey'));
            assert(!html.includes('Submit'));
        });

        it('escapes HTML special characters to prevent stored XSS attacks', function () {
            const form = {
                id: 'form_xss',
                name: '<script>alert("xss-title")</script>',
                description: '<img src=x onerror=alert("xss-desc")>',
                status: 'active',
                schema: JSON.stringify({
                    fields: [
                        {
                            id: 'field_xss',
                            name: 'xss_field',
                            label: '<b onmouseover=alert("xss-label")>Label</b>',
                            placeholder: '"><script>alert("xss-ph")</script>',
                            type: 'select',
                            options: ['<script>alert("opt")</script>']
                        }
                    ],
                    success_title: '<script>alert("xss-success-title")</script>',
                    success_message: '<script>alert("xss-success-msg")</script>'
                })
            };

            const html = formsService.renderFormHtmlMarkup(form, 'form_xss');
            assert(!html.includes('<script>alert('));
            assert(!html.includes('<img src=x'));
            assert(html.includes('&lt;script&gt;alert(&quot;xss-title&quot;)&lt;/script&gt;'));
            assert(html.includes('&lt;img src=x onerror=alert(&quot;xss-desc&quot;)&gt;'));
            assert(html.includes('&lt;b onmouseover=alert(&quot;xss-label&quot;)&gt;Label&lt;/b&gt;'));
            assert(html.includes('&quot;&gt;&lt;script&gt;alert(&quot;xss-ph&quot;)&lt;/script&gt;'));
            assert(html.includes('&lt;script&gt;alert(&quot;opt&quot;)&lt;/script&gt;'));
        });

        it('sanitizes custom_css to prevent style tag breakouts', function () {
            const form = {
                id: 'form_css',
                name: 'CSS Test',
                status: 'active',
                schema: JSON.stringify({
                    custom_css: '</style><script>alert("css-breakout")</script>',
                    fields: []
                })
            };

            const html = formsService.renderFormHtmlMarkup(form, 'form_css');
            assert(!html.includes('</style><script>'));
        });
    });

    describe('attachFormToPost & detachFormFromPost', function () {
        it('attaches form embed to post lexical content', async function () {
            const initialLexical = JSON.stringify({
                root: {
                    children: [
                        {type: 'paragraph', version: 1, children: []}
                    ],
                    direction: null,
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            });

            let updatedLexical = null;
            const knexMock = sinon.stub(models.Base, 'knex').callsFake(() => ({
                where: () => ({
                    first: sinon.stub().resolves({
                        id: 'post_1',
                        lexical: initialLexical
                    }),
                    update: (data) => {
                        updatedLexical = data.lexical;
                        return Promise.resolve(1);
                    }
                })
            }));

            sinon.stub(models.Form, 'findOne').resolves({
                id: 'form_123',
                name: 'Contact Form',
                description: 'Please get in touch',
                get(key) {
                    if (key === 'schema') {
                        return JSON.stringify({fields: [{id: 'name', label: 'Your Name', type: 'text'}]});
                    }
                    if (key === 'name') {
                        return 'Contact Form';
                    }
                    return null;
                }
            });

            const res = await formsService.attachFormToPost('form_123', 'post_1', 'end');
            assert.equal(res.attached, true);
            const parsed = JSON.parse(updatedLexical);
            assert(parsed.root.children.some(c => c.html && c.html.includes('data-ghost-form="form_123"')));
            knexMock.restore();
        });

        it('detaches form embed from post lexical content', async function () {
            const lexicalWithForm = JSON.stringify({
                root: {
                    children: [
                        {type: 'paragraph', version: 1, children: []},
                        {type: 'html', version: 1, html: '<div data-ghost-form="form_123"></div><script src="/ghost/api/content/forms/form_123/embed.js"></script>'}
                    ],
                    direction: null,
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            });

            let updatedLexical = null;
            const knexMock = sinon.stub(models.Base, 'knex').callsFake(() => ({
                where: () => ({
                    first: sinon.stub().resolves({
                        id: 'post_1',
                        lexical: lexicalWithForm
                    }),
                    update: (data) => {
                        updatedLexical = data.lexical;
                        return Promise.resolve(1);
                    }
                })
            }));

            const res = await formsService.detachFormFromPost('form_123', 'post_1');
            assert.equal(res.detached, true);
            assert(!updatedLexical.includes('data-ghost-form="form_123"'));
            knexMock.restore();
        });
    });

    describe('cleanupFormFromPostsAndPages', function () {
        it('cleans up form embeds from all affected posts and pages in the database', async function () {
            const postWithForm = {
                id: 'post_abc',
                lexical: JSON.stringify({
                    root: {
                        children: [
                            {type: 'html', version: 1, html: '<div data-ghost-form="form_xyz"></div>'}
                        ]
                    }
                }),
                html: '<div id="ghost-form-container-form_xyz">Form</div>'
            };

            let updatedFields = null;
            const knexMock = sinon.stub(models.Base, 'knex').callsFake(() => ({
                where: (fn) => {
                    if (typeof fn === 'function') {
                        return Promise.resolve([postWithForm]);
                    }
                    return {
                        update: (data) => {
                            updatedFields = data;
                            return Promise.resolve(1);
                        }
                    };
                }
            }));

            const count = await formsService.cleanupFormFromPostsAndPages('form_xyz');
            assert.equal(count, 1);
            assert(updatedFields !== null);
            assert(!updatedFields.lexical.includes('form_xyz'));
            assert(!updatedFields.html.includes('form_xyz'));
            knexMock.restore();
        });
    });

    describe('syncFormToAttachedPosts', function () {
        it('synchronizes updated form markup to all attached posts and pages', async function () {
            const postWithOldForm = {
                id: 'post_100',
                lexical: JSON.stringify({
                    root: {
                        children: [
                            {type: 'html', version: 1, html: '<div data-ghost-form="form_sync">Old Content</div>'}
                        ]
                    }
                }),
                html: '<!--kg-card-begin: html--><div data-ghost-form="form_sync">Old Content</div><!--kg-card-end: html-->'
            };

            let updatedPostData = null;
            const knexMock = sinon.stub(models.Base, 'knex').callsFake(() => ({
                where: (fn) => {
                    if (typeof fn === 'function') {
                        return Promise.resolve([postWithOldForm]);
                    }
                    return {
                        update: (data) => {
                            updatedPostData = data;
                            return Promise.resolve(1);
                        }
                    };
                }
            }));

            sinon.stub(models.Form, 'findOne').resolves({
                id: 'form_sync',
                name: 'Updated Form Title',
                get(key) {
                    if (key === 'status') {
                        return 'active';
                    }
                    if (key === 'name') {
                        return 'Updated Form Title';
                    }
                    if (key === 'schema') {
                        return JSON.stringify({
                            fields: [
                                {id: 'f1', name: 'new_field', label: 'Brand New Field', type: 'text'}
                            ]
                        });
                    }
                    return null;
                }
            });

            const updatedCount = await formsService.syncFormToAttachedPosts('form_sync');
            assert.equal(updatedCount, 1);
            assert(updatedPostData !== null);
            assert(updatedPostData.lexical.includes('Brand New Field'));
            assert(updatedPostData.lexical.includes('Updated Form Title'));
            assert(updatedPostData.html.includes('Brand New Field'));
            knexMock.restore();
        });

        it('archives attached form by hiding it in posts without deleting the attachment', async function () {
            const postWithActiveForm = {
                id: 'post_200',
                lexical: JSON.stringify({
                    root: {
                        children: [
                            {type: 'html', version: 1, html: '<div data-ghost-form="form_arch_sync">Active Form</div>'}
                        ]
                    }
                }),
                html: '<!--kg-card-begin: html--><div data-ghost-form="form_arch_sync">Active Form</div><!--kg-card-end: html-->'
            };

            let updatedPostData = null;
            const knexMock = sinon.stub(models.Base, 'knex').callsFake(() => ({
                where: (fn) => {
                    if (typeof fn === 'function') {
                        return Promise.resolve([postWithActiveForm]);
                    }
                    return {
                        update: (data) => {
                            updatedPostData = data;
                            return Promise.resolve(1);
                        }
                    };
                }
            }));

            sinon.stub(models.Form, 'findOne').resolves({
                id: 'form_arch_sync',
                name: 'Archived Form Title',
                get(key) {
                    if (key === 'status') {
                        return 'archived';
                    }
                    if (key === 'name') {
                        return 'Archived Form Title';
                    }
                    return null;
                }
            });

            const updatedCount = await formsService.syncFormToAttachedPosts('form_arch_sync');
            assert.equal(updatedCount, 1);
            assert(updatedPostData !== null);
            // Must still contain the form ID marker in lexical and html
            assert(updatedPostData.lexical.includes('form_arch_sync'));
            assert(updatedPostData.lexical.includes('ghost-form-archived'));
            const parsedLex = JSON.parse(updatedPostData.lexical);
            assert(parsedLex.root.children[0].html.includes('data-ghost-form="form_arch_sync"'));

            assert(updatedPostData.html.includes('data-ghost-form="form_arch_sync"'));
            assert(updatedPostData.html.includes('ghost-form-archived'));
            assert(updatedPostData.html.includes('style="display: none;"'));
            // Must NOT contain active form content
            assert(!updatedPostData.html.includes('Active Form'));
            knexMock.restore();
        });

        it('restores full form markup when an archived form is re-activated', async function () {
            const postWithArchivedForm = {
                id: 'post_300',
                lexical: JSON.stringify({
                    root: {
                        children: [
                            {type: 'html', version: 1, html: '<div data-ghost-form="form_restore_sync" class="ghost-form-archived" style="display: none;" aria-hidden="true"></div><script src="/ghost/api/content/forms/form_restore_sync/embed.js" async></script>'}
                        ]
                    }
                }),
                html: '<!--kg-card-begin: html--><div data-ghost-form="form_restore_sync" class="ghost-form-archived" style="display: none;" aria-hidden="true"></div><script src="/ghost/api/content/forms/form_restore_sync/embed.js" async></script><!--kg-card-end: html-->'
            };

            let updatedPostData = null;
            const knexMock = sinon.stub(models.Base, 'knex').callsFake(() => ({
                where: (fn) => {
                    if (typeof fn === 'function') {
                        return Promise.resolve([postWithArchivedForm]);
                    }
                    return {
                        update: (data) => {
                            updatedPostData = data;
                            return Promise.resolve(1);
                        }
                    };
                }
            }));

            sinon.stub(models.Form, 'findOne').resolves({
                id: 'form_restore_sync',
                name: 'Reactivated Feedback Form',
                get(key) {
                    if (key === 'status') {
                        return 'active';
                    }
                    if (key === 'name') {
                        return 'Reactivated Feedback Form';
                    }
                    if (key === 'schema') {
                        return JSON.stringify({
                            fields: [
                                {id: 'restored_field', name: 'email', label: 'Your Email', type: 'email'}
                            ]
                        });
                    }
                    return null;
                }
            });

            const updatedCount = await formsService.syncFormToAttachedPosts('form_restore_sync');
            assert.equal(updatedCount, 1);
            assert(updatedPostData !== null);
            // Must restore active form markup and field labels
            assert(updatedPostData.lexical.includes('Reactivated Feedback Form'));
            assert(updatedPostData.lexical.includes('Your Email'));
            assert(!updatedPostData.lexical.includes('ghost-form-archived'));
            assert(updatedPostData.html.includes('Reactivated Feedback Form'));
            assert(updatedPostData.html.includes('Your Email'));
            assert(updatedPostData.html.includes('ghost-form-container'));
            assert(!updatedPostData.html.includes('ghost-form-archived'));
            knexMock.restore();
        });

        it('cleans up posts only if form model does not exist in DB', async function () {
            sinon.stub(models.Form, 'findOne').resolves(null);
            const cleanupStub = sinon.stub(formsService, 'cleanupFormFromPostsAndPages').resolves(3);

            const result = await formsService.syncFormToAttachedPosts('form_deleted');
            assert.equal(result, 3);
            assert(cleanupStub.calledOnceWith('form_deleted'));
            cleanupStub.restore();
        });
    });
});

