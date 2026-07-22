const assert = require('node:assert/strict');
const ObjectId = require('bson-objectid').default;
const sinon = require('sinon');

const automationsApi = require('../../../../../core/server/services/automations/automations-api');
const {EMPTY_EMAIL_LEXICAL, NON_EMPTY_EMAIL_LEXICAL} = require('../../../../utils/automations-fixtures');

const buildSendEmailAction = (dataOverrides = {}) => ({
    id: ObjectId().toHexString(),
    type: 'send_email',
    data: {
        email_subject: 'Welcome',
        email_lexical: NON_EMPTY_EMAIL_LEXICAL,
        email_design_setting_id: '64b6f7b7c8f1a2b3c4d5e6f7',
        ...dataOverrides
    }
});

describe('automations API', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('edit', function () {
        const automationId = ObjectId().toHexString();

        it('rejects activating an automation with an empty email subject', async function () {
            await assert.rejects(
                automationsApi.edit(automationId, {
                    status: 'active',
                    actions: [buildSendEmailAction({email_subject: ''})],
                    edges: []
                }),
                /subject line/
            );
        });

        it('rejects activating an automation with an empty email body', async function () {
            await assert.rejects(
                automationsApi.edit(automationId, {
                    status: 'active',
                    actions: [buildSendEmailAction({email_lexical: EMPTY_EMAIL_LEXICAL})],
                    edges: []
                }),
                /body/
            );
        });

        it('rejects a send email action with invalid JSON', async function () {
            await assert.rejects(
                automationsApi.edit(automationId, {
                    status: 'inactive',
                    actions: [buildSendEmailAction({email_lexical: '{"root":'})],
                    edges: []
                }),
                /well-formed Lexical document/
            );
        });

        it('rejects an active send email action with invalid JSON as malformed Lexical', async function () {
            await assert.rejects(
                automationsApi.edit(automationId, {
                    status: 'active',
                    actions: [buildSendEmailAction({email_lexical: '{"root":'})],
                    edges: []
                }),
                /well-formed Lexical document/
            );
        });

        it('rejects a send email action with JSON that is not a Lexical document', async function () {
            await assert.rejects(
                automationsApi.edit(automationId, {
                    status: 'inactive',
                    actions: [buildSendEmailAction({email_lexical: JSON.stringify({children: []})})],
                    edges: []
                }),
                /well-formed Lexical document/
            );
        });

        it('rejects a draft send email action with a malformed empty paragraph', async function () {
            await assert.rejects(
                automationsApi.edit(automationId, {
                    status: 'inactive',
                    actions: [buildSendEmailAction({
                        email_lexical: JSON.stringify({
                            root: {
                                children: [{
                                    type: 'paragraph',
                                    version: 1
                                }],
                                type: 'root',
                                version: 1
                            }
                        })
                    })],
                    edges: []
                }),
                /well-formed Lexical document/
            );
        });

        it('rejects a send email action with malformed Lexical child nodes', async function () {
            await assert.rejects(
                automationsApi.edit(automationId, {
                    status: 'inactive',
                    actions: [buildSendEmailAction({
                        email_lexical: JSON.stringify({
                            root: {
                                children: [{type: 'unknown-node', version: 1}],
                                type: 'root',
                                version: 1
                            }
                        })
                    })],
                    edges: []
                }),
                /well-formed Lexical document/
            );
        });
    });
});
