const assert = require('node:assert/strict');
const sinon = require('sinon');
const FormsImporter = require('../../../../../../core/server/data/importer/importers/data/forms-importer');
const FormSubmissionsImporter = require('../../../../../../core/server/data/importer/importers/data/form-submissions-importer');
const PostsImporter = require('../../../../../../core/server/data/importer/importers/data/posts-importer');
const models = require('../../../../../../core/server/models');

describe('Forms Importers', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('FormsImporter', function () {
        describe('sanitizeAttributes', function () {
            it('defaults missing name, status, and schema', function () {
                const importer = new FormsImporter({
                    forms: [
                        {id: 'form_1'}
                    ]
                });

                importer.sanitizeAttributes();

                assert.equal(importer.dataToImport[0].name, 'Untitled Form');
                assert.equal(importer.dataToImport[0].status, 'active');
                assert.equal(importer.dataToImport[0].schema, '{"fields":[]}');
            });

            it('serializes object schema to JSON string', function () {
                const importer = new FormsImporter({
                    forms: [
                        {id: 'form_1', name: 'Contact Form', status: 'archived', schema: {fields: [{id: 'name', type: 'text'}]}}
                    ]
                });

                importer.sanitizeAttributes();

                assert.equal(importer.dataToImport[0].name, 'Contact Form');
                assert.equal(importer.dataToImport[0].status, 'archived');
                assert.equal(typeof importer.dataToImport[0].schema, 'string');
                assert(importer.dataToImport[0].schema.includes('name'));
            });
        });

        describe('beforeImport', function () {
            it('preserves form ID when no conflict exists in destination database', async function () {
                const importer = new FormsImporter({
                    forms: [
                        {id: '6abcddc6ae2f8800263d6ffe', name: 'Contact Form'}
                    ]
                });
                importer.existingData = [];

                await importer.beforeImport();

                assert.equal(importer.dataToImport[0].id, '6abcddc6ae2f8800263d6ffe');
                assert.equal(importer.originalIdMap['6abcddc6ae2f8800263d6ffe'], '6abcddc6ae2f8800263d6ffe');
                assert.equal(importer.dataToImport[0].isDuplicate, undefined);
            });

            it('marks form as duplicate if form with same ID and name already exists', async function () {
                const formId = '6abcddc6ae2f8800263d6ffe';
                const importer = new FormsImporter({
                    forms: [
                        {id: formId, name: 'Contact Form'}
                    ]
                });
                importer.existingData = [{id: formId, name: 'Contact Form'}];

                await importer.beforeImport();

                assert.equal(importer.dataToImport[0].id, formId);
                assert.equal(importer.dataToImport[0].isDuplicate, true);
                assert.equal(importer.originalIdMap[formId], formId);
            });

            it('generates new ID if existing form has same ID but different name', async function () {
                const formId = '6abcddc6ae2f8800263d6ffe';
                const importer = new FormsImporter({
                    forms: [
                        {id: formId, name: 'New Contact Form'}
                    ]
                });
                importer.existingData = [{id: formId, name: 'Completely Different Form'}];

                await importer.beforeImport();

                const newId = importer.dataToImport[0].id;
                assert.notEqual(newId, formId);
                assert.equal(importer.originalIdMap[newId], formId);
                assert.equal(importer.dataToImport[0].isDuplicate, undefined);
            });
        });

        describe('doImport', function () {
            it('persists non-duplicate forms to models.Form.add', async function () {
                const importer = new FormsImporter({
                    forms: [
                        {id: '6abcddc6ae2f8800263d6ffe', name: 'Contact Form', schema: '{"fields":[]}', status: 'active'}
                    ]
                });
                importer.existingData = [];
                await importer.beforeImport();

                const addStub = sinon.stub(models.Form, 'add').resolves({
                    id: '6abcddc6ae2f8800263d6ffe',
                    get: key => (key === 'name' ? 'Contact Form' : null),
                    toJSON: () => ({id: '6abcddc6ae2f8800263d6ffe', name: 'Contact Form'})
                });

                await importer.doImport({}, {returnImportedData: true});

                assert(addStub.calledOnce);
                assert.equal(addStub.firstCall.args[0].id, '6abcddc6ae2f8800263d6ffe');
                assert.equal(importer.importedData.length, 1);
                assert.equal(importer.importedData[0].id, '6abcddc6ae2f8800263d6ffe');
                assert.equal(importer.importedDataToReturn.length, 1);
            });

            it('skips adding duplicate forms but tracks them in importedData', async function () {
                const formId = '6abcddc6ae2f8800263d6ffe';
                const importer = new FormsImporter({
                    forms: [
                        {id: formId, name: 'Contact Form', schema: '{"fields":[]}', status: 'active'}
                    ]
                });
                importer.existingData = [{id: formId, name: 'Contact Form'}];
                await importer.beforeImport();

                const addStub = sinon.stub(models.Form, 'add');

                await importer.doImport({}, {returnImportedData: true});

                assert.equal(addStub.called, false);
                assert.equal(importer.importedData.length, 1);
                assert.equal(importer.importedData[0].id, formId);
            });
        });
    });

    describe('FormSubmissionsImporter', function () {
        it('imports submissions and remaps form_id if parent form ID was changed', async function () {
            const oldFormId = 'old_form_123';
            const newFormId = 'new_form_456';

            const importer = new FormSubmissionsImporter({
                form_submissions: [
                    {id: 'sub_1', form_id: oldFormId, data: '{"email":"alice@example.com"}'}
                ]
            });

            importer.requiredImportedData = {
                forms: [
                    {originalId: oldFormId, id: newFormId}
                ]
            };
            importer.existingForms = [];

            await importer.beforeImport();

            const addStub = sinon.stub(models.FormSubmission, 'add').resolves({
                id: 'sub_imported',
                toJSON: () => ({id: 'sub_imported', form_id: newFormId})
            });

            await importer.doImport({}, {returnImportedData: true});

            assert(addStub.calledOnce);
            assert.equal(addStub.firstCall.args[0].form_id, newFormId);
            assert.equal(importer.importedData.length, 1);
        });

        it('ignores submission if parent form cannot be found in imported or existing data', async function () {
            const importer = new FormSubmissionsImporter({
                form_submissions: [
                    {id: 'sub_1', form_id: 'nonexistent_form', data: '{"email":"bob@example.com"}'}
                ]
            });

            importer.requiredImportedData = {forms: []};
            importer.existingForms = [];

            await importer.beforeImport();

            const addStub = sinon.stub(models.FormSubmission, 'add');

            await importer.doImport({}, {returnImportedData: true});

            assert.equal(addStub.called, false);
            assert.equal(importer.problems.length, 1);
            assert(importer.problems[0].message.includes('parent form could not be found'));
        });
    });

    describe('PostsImporter Form Remapping', function () {
        it('rewrites data-ghost-form and script src when form ID was remapped', function () {
            const oldFormId = 'old_form_abc123';
            const newFormId = 'new_form_xyz789';

            const importer = new PostsImporter({
                posts: [
                    {
                        id: 'post_1',
                        html: `<div data-ghost-form="${oldFormId}" class="ghost-form-container"></div><script src="/ghost/api/content/forms/${oldFormId}/embed.js" async></script>`,
                        lexical: JSON.stringify({
                            root: {
                                children: [{
                                    type: 'html',
                                    html: `<div data-ghost-form="${oldFormId}"></div><script src="/ghost/api/content/forms/${oldFormId}/embed.js"></script>`
                                }]
                            }
                        }),
                        mobiledoc: JSON.stringify({
                            version: '0.3.1',
                            cards: [['html', {html: `<div data-ghost-form="${oldFormId}"></div><script src="/ghost/api/content/forms/${oldFormId}/embed.js"></script>`}]]
                        })
                    }
                ]
            });

            importer.requiredImportedData = {
                newsletters: [],
                forms: [
                    {originalId: oldFormId, id: newFormId}
                ]
            };
            importer.requiredExistingData = {
                users: [{id: 'user_1', roles: [{name: 'Owner'}]}],
                newsletters: [],
                forms: []
            };

            importer.replaceIdentifiers();

            const post = importer.dataToImport[0];
            assert(post.html.includes(`data-ghost-form="${newFormId}"`));
            assert(post.html.includes(`/forms/${newFormId}/embed.js`));
            assert(!post.html.includes(oldFormId));

            const parsedLexical = JSON.parse(post.lexical);
            assert(parsedLexical.root.children[0].html.includes(`data-ghost-form="${newFormId}"`));
            assert(parsedLexical.root.children[0].html.includes(`/forms/${newFormId}/embed.js`));
            assert(!post.lexical.includes(oldFormId));

            const parsedMobiledoc = JSON.parse(post.mobiledoc);
            assert(parsedMobiledoc.cards[0][1].html.includes(`data-ghost-form="${newFormId}"`));
            assert(parsedMobiledoc.cards[0][1].html.includes(`/forms/${newFormId}/embed.js`));
            assert(!post.mobiledoc.includes(oldFormId));
        });
    });
});
