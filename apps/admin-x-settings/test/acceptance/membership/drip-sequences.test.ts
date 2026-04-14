import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, responseFixtures} from '@tryghost/admin-x-framework/test/acceptance';

const configWithDripSequences = {
    ...responseFixtures.config,
    config: {
        ...responseFixtures.config.config,
        labs: {
            ...responseFixtures.config.config.labs,
            dripSequences: true
        }
    }
};

const emptyFreeSequenceResponse = {
    drip_sequences: [{
        automation_id: null,
        automation_slug: 'member-welcome-email-free',
        emails: []
    }]
};

const emptyPaidSequenceResponse = {
    drip_sequences: [{
        automation_id: null,
        automation_slug: 'member-welcome-email-paid',
        emails: []
    }]
};

test.describe('Drip sequences settings', async () => {
    test('loads and saves free/paid sequences', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseConfig: {method: 'GET', path: '/config/', response: configWithDripSequences},
            readFreeSequence: {method: 'GET', path: '/drip_sequences/member-welcome-email-free/', response: emptyFreeSequenceResponse},
            readPaidSequence: {method: 'GET', path: '/drip_sequences/member-welcome-email-paid/', response: emptyPaidSequenceResponse},
            editFreeSequence: {method: 'PUT', path: '/drip_sequences/member-welcome-email-free/', response: {
                drip_sequences: [{
                    automation_id: 'free-automation-id',
                    automation_slug: 'member-welcome-email-free',
                    emails: [{
                        id: 'free-email-1',
                        subject: 'Free step',
                        lexical: '{"root":{"children":[]}}',
                        delay_days: 2,
                        next_welcome_email_automated_email_id: null,
                        created_at: '2026-04-01T00:00:00.000Z',
                        updated_at: null
                    }]
                }]
            }},
            editPaidSequence: {method: 'PUT', path: '/drip_sequences/member-welcome-email-paid/', response: {
                drip_sequences: [{
                    automation_id: 'paid-automation-id',
                    automation_slug: 'member-welcome-email-paid',
                    emails: [{
                        id: 'paid-email-1',
                        subject: 'Paid step',
                        lexical: '{"root":{"children":[]}}',
                        delay_days: 5,
                        next_welcome_email_automated_email_id: null,
                        created_at: '2026-04-01T00:00:00.000Z',
                        updated_at: null
                    }]
                }]
            }}
        }});

        await page.goto('/#/drip-sequences');

        const section = page.getByTestId('drip-sequences');
        await expect(section).toBeVisible();

        await section.getByRole('button', {name: 'Add email'}).first().click();
        await section.getByRole('button', {name: 'Add email'}).nth(1).click();

        await section.getByLabel('Delay (days)').first().fill('2');
        await section.getByLabel('Subject').first().fill('Free step');
        await section.getByLabel('Body').first().fill('Free body');

        await section.getByLabel('Delay (days)').nth(1).fill('5');
        await section.getByLabel('Subject').nth(1).fill('Paid step');
        await section.getByLabel('Body').nth(1).fill('Paid body');

        await section.getByRole('button', {name: 'Save'}).click();

        expect(lastApiRequests.editFreeSequence?.body).toMatchObject({
            drip_sequences: [{
                emails: [{
                    subject: 'Free step',
                    delay_days: 2
                }]
            }]
        });
        expect(lastApiRequests.editPaidSequence?.body).toMatchObject({
            drip_sequences: [{
                emails: [{
                    subject: 'Paid step',
                    delay_days: 5
                }]
            }]
        });
    });
});
