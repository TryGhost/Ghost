const assert = require('node:assert/strict');
const sinon = require('sinon');
const Knex = require('knex');
const logging = require('@tryghost/logging');

const migration = require('../../../../../core/server/data/migrations/versions/6.45/2026-06-09-16-01-43-backfill-email-design-sender-fields');

async function setupDb() {
    const knex = Knex({
        client: 'sqlite',
        connection: {
            filename: ':memory:'
        },
        useNullAsDefault: true
    });

    await knex.schema.createTable('email_design_settings', function (table) {
        table.string('id').primary();
        table.string('sender_name');
        table.string('sender_email');
        table.string('sender_reply_to');
    });

    await knex.schema.createTable('automations', function (table) {
        table.string('id').primary();
        table.string('slug');
    });

    await knex.schema.createTable('welcome_email_automated_emails', function (table) {
        table.string('id').primary();
        table.string('welcome_email_automation_id');
        table.string('email_design_setting_id');
        table.string('sender_name');
        table.string('sender_email');
        table.string('sender_reply_to');
    });

    return knex;
}

async function runUp(knex) {
    const transacting = await knex.transaction();
    await migration.up({transacting});
    await transacting.commit();
}

async function insertWelcomeEmail(knex, {id, automationId, slug, designId, senderName, senderEmail, senderReplyTo}) {
    await knex('automations').insert({
        id: automationId,
        slug
    });

    await knex('welcome_email_automated_emails').insert({
        id,
        welcome_email_automation_id: automationId,
        email_design_setting_id: designId,
        sender_name: senderName,
        sender_email: senderEmail,
        sender_reply_to: senderReplyTo
    });
}

describe('Migration: backfill email design sender fields', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('copies matching sender values from shared welcome email design rows', async function () {
        const knex = await setupDb();

        await knex('email_design_settings').insert({id: 'design-1'});
        await insertWelcomeEmail(knex, {
            id: 'free-email',
            automationId: 'free-automation',
            slug: 'member-welcome-email',
            designId: 'design-1',
            senderName: 'Shared Sender',
            senderEmail: 'shared@example.com',
            senderReplyTo: 'reply@example.com'
        });
        await insertWelcomeEmail(knex, {
            id: 'paid-email',
            automationId: 'paid-automation',
            slug: 'member-welcome-email-paid',
            designId: 'design-1',
            senderName: 'Shared Sender',
            senderEmail: 'shared@example.com',
            senderReplyTo: 'reply@example.com'
        });

        await runUp(knex);

        const design = await knex('email_design_settings').where('id', 'design-1').first();
        assert.equal(design.sender_name, 'Shared Sender');
        assert.equal(design.sender_email, 'shared@example.com');
        assert.equal(design.sender_reply_to, 'reply@example.com');

        await knex.destroy();
    });

    it('uses the non-empty sender value when only one shared welcome email row has a value', async function () {
        const knex = await setupDb();

        await knex('email_design_settings').insert({id: 'design-1'});
        await insertWelcomeEmail(knex, {
            id: 'free-email',
            automationId: 'free-automation',
            slug: 'member-welcome-email',
            designId: 'design-1',
            senderName: '',
            senderEmail: null,
            senderReplyTo: null
        });
        await insertWelcomeEmail(knex, {
            id: 'paid-email',
            automationId: 'paid-automation',
            slug: 'member-welcome-email-paid',
            designId: 'design-1',
            senderName: 'Paid Sender',
            senderEmail: 'paid@example.com',
            senderReplyTo: 'paid-reply@example.com'
        });

        await runUp(knex);

        const design = await knex('email_design_settings').where('id', 'design-1').first();
        assert.equal(design.sender_name, 'Paid Sender');
        assert.equal(design.sender_email, 'paid@example.com');
        assert.equal(design.sender_reply_to, 'paid-reply@example.com');

        await knex.destroy();
    });

    it('logs conflicts and uses free welcome email sender precedence', async function () {
        const knex = await setupDb();
        const warn = sinon.spy(logging, 'warn');

        await knex('email_design_settings').insert({id: 'design-1'});
        await insertWelcomeEmail(knex, {
            id: 'free-email',
            automationId: 'free-automation',
            slug: 'member-welcome-email',
            designId: 'design-1',
            senderName: 'Free Sender',
            senderEmail: 'free@example.com',
            senderReplyTo: 'free-reply@example.com'
        });
        await insertWelcomeEmail(knex, {
            id: 'paid-email',
            automationId: 'paid-automation',
            slug: 'member-welcome-email-paid',
            designId: 'design-1',
            senderName: 'Paid Sender',
            senderEmail: 'paid@example.com',
            senderReplyTo: 'paid-reply@example.com'
        });

        await runUp(knex);

        const design = await knex('email_design_settings').where('id', 'design-1').first();
        assert.equal(design.sender_name, 'Free Sender');
        assert.equal(design.sender_email, 'free@example.com');
        assert.equal(design.sender_reply_to, 'free-reply@example.com');
        sinon.assert.calledWith(warn, sinon.match('conflicting non-empty welcome email values found; using free welcome email value'));

        await knex.destroy();
    });
});
