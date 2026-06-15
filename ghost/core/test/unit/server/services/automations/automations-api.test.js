const assert = require('node:assert/strict');
const ObjectId = require('bson-objectid').default;

const automationsApi = require('../../../../../core/server/services/automations/automations-api');

const EMPTY_EMAIL_LEXICAL = JSON.stringify({
    root: {children: [], direction: null, format: '', indent: 0, type: 'root', version: 1}
});

const NON_EMPTY_EMAIL_LEXICAL = JSON.stringify({
    root: {children: [{type: 'paragraph', children: [{type: 'text', text: 'Lorem ipsum.'}]}], direction: null, format: '', indent: 0, type: 'root', version: 1}
});

const buildSendEmailAction = (dataOverrides = {}) => ({
    id: ObjectId().toHexString(),
    type: 'send_email',
    data: {
        email_subject: 'Welcome',
        email_lexical: NON_EMPTY_EMAIL_LEXICAL,
        email_sender_name: null,
        email_sender_email: null,
        email_sender_reply_to: null,
        email_design_setting_id: '64b6f7b7c8f1a2b3c4d5e6f7',
        ...dataOverrides
    }
});

describe('automations API edit validation', function () {
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
});
