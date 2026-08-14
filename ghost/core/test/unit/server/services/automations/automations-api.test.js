const assert = require('node:assert/strict');
const ObjectId = require('bson-objectid').default;

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
    });
});
