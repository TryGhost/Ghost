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
});

