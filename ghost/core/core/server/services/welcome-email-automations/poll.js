const logging = require('@tryghost/logging');
const db = require('../../data/db');
const {MEMBER_WELCOME_EMAIL_SLUGS} = require('../member-welcome-emails/constants');
const {AutomatedEmailRecipient, Member, WelcomeEmailAutomationRun} = require('../../models');
/** @import {Knex} from 'knex' */

/**
 * @internal
 * @typedef {object} Run
 * @prop {string} id
 * @prop {string} member_id
 * @prop {number} step_attempts
 * @prop {null | string} next_welcome_email_automated_email_id
 * @prop {string} automation_slug
 * @prop {string} automated_email_id
 */

/**
 * @internal
 * @typedef {object} MemberWelcomeEmailService
 * @prop {() => unknown} init
 * @prop {object} api
 * @prop {() => PromiseLike<unknown>} api.loadMemberWelcomeEmails
 * @prop {(options: {
 *     member: {
 *         name: string;
 *         email: string;
 *         uuid: string;
 *     };
 *     memberStatus: string;
 * }) => PromiseLike<unknown>} api.send
 */

const LOG_KEY = '[WELCOME-EMAIL-AUTOMATIONS]';
const MAX_RUNS_PER_BATCH = 100;
const MAX_ATTEMPTS = 10;
const RETRY_DELAY_MS = 10 * 60 * 1000;
const LOCK_TIMEOUT = 30 * 60 * 1000;

const slugToMemberStatus = new Map(
    Object.entries(MEMBER_WELCOME_EMAIL_SLUGS).map(([status, slug]) => [slug, status])
);

/**
 * @returns {Promise<{
 *     runs: Run[];
 *     nextFutureReadyAt: null | Date;
 * }>}
 */
async function fetchAndLockRuns() {
    const now = new Date();
    const lockCutoff = new Date(now.getTime() - LOCK_TIMEOUT);

    return await db.knex.transaction(async (trx) => {
        /** @type {Run[]} */
        const runs = await trx('welcome_email_automation_runs as r')
            .join('welcome_email_automations as a', 'r.welcome_email_automation_id', 'a.id')
            .join('welcome_email_automated_emails as e', 'r.next_welcome_email_automated_email_id', 'e.id')
            .whereNotNull('r.next_welcome_email_automated_email_id')
            .where('r.ready_at', '<=', now)
            .where(function () {
                this.whereNull('r.step_started_at').orWhere('r.step_started_at', '<', lockCutoff);
            })
            .select('r.id', 'r.member_id', 'r.step_attempts', 'r.next_welcome_email_automated_email_id', 'a.slug as automation_slug', 'e.id as automated_email_id')
            .limit(MAX_RUNS_PER_BATCH);

        if (runs.length === 0) {
            const result = await trx('welcome_email_automation_runs')
                .whereNotNull('next_welcome_email_automated_email_id')
                .where('ready_at', '>', now)
                .select(db.knex.raw('MIN(ready_at) as next_ready_at'))
                .first();
            const nextFutureReadyAt = result?.next_ready_at ? new Date(result.next_ready_at) : null;
            return {runs, nextFutureReadyAt};
        }

        /** @type {string[]} */ const ids = [];

        for (const run of runs) {
            ids.push(run.id);
            run.step_attempts += 1;
        }

        await trx('welcome_email_automation_runs').whereIn('id', ids).update({
            step_started_at: now,
            step_attempts: db.knex.raw('step_attempts + 1'),
            updated_at: now
        });

        return {runs, nextFutureReadyAt: null};
    });
}

/**
 * @param {string} runId
 * @param {Record<string, unknown>} attrs
 * @param {Knex.Transaction} [transacting]
 * @returns {Promise<void>}
 */
async function updateRun(runId, attrs, transacting) {
    await WelcomeEmailAutomationRun.edit(attrs, {id: runId, transacting});
}

/**
 * @param {string} runId
 * @param {'finished' | 'email send failed' | 'member changed status' | 'member not found' | 'member unsubscribed'} exitReason
 * @param {Knex.Transaction} [transacting]
 * @returns {Promise<void>}
 */
async function markExited(runId, exitReason, transacting) {
    await updateRun(runId, {
        next_welcome_email_automated_email_id: null,
        ready_at: null,
        step_started_at: null,
        step_attempts: 0,
        exit_reason: exitReason,
        updated_at: new Date()
    }, transacting);
}

/**
 * @param {string} runId
 * @returns {Promise<void>}
 */
async function markMaxAttemptsExceeded(runId) {
    await markExited(runId, 'email send failed');
    logging.warn(
        {
            system: {
                event: 'welcome_email_automations.max_attempts',
                run_id: runId
            }
        },
        `${LOG_KEY} Run ${runId} exceeded max attempts`
    );
}

/**
 * @param {string} runId
 * @param {Readonly<Date>} retryAt
 * @returns {Promise<void>}
 */
async function markRetry(runId, retryAt) {
    await updateRun(runId, {
        step_started_at: null,
        ready_at: retryAt,
        updated_at: new Date()
    });
}

/**
 * @param {object} options
 * @param {Run} options.run
 * @param {MemberWelcomeEmailService} options.memberWelcomeEmailService
 * @param {(date: Readonly<Date>) => unknown} options.enqueueAnotherPollAt
 */
async function processRun({
    run,
    memberWelcomeEmailService,
    enqueueAnotherPollAt
}) {
    if (run.step_attempts > MAX_ATTEMPTS) {
        await markMaxAttemptsExceeded(run.id);
        return;
    }

    const memberStatus = slugToMemberStatus.get(run.automation_slug);
    if (!memberStatus) {
        await markExited(run.id, 'email send failed');
        logging.error(
            {
                system: {
                    event: 'welcome_email_automations.unknown_slug',
                    slug: run.automation_slug
                }
            },
            `${LOG_KEY} Unknown automation slug: ${run.automation_slug}`
        );
        return;
    }

    try {
        const member = await Member.findOne({id: run.member_id}, {withRelated: ['newsletters']});

        // TODO(NY-1192): Bail if member no longer exists
        // TODO(NY-1193): Bail if member is unsubscribed
        // TODO(NY-1194): Bail if member's status has changed

        await memberWelcomeEmailService.api.send({
            member: {
                name: member.get('name'),
                email: member.get('email'),
                uuid: member.get('uuid')
            },
            memberStatus
        });

        await db.knex.transaction(async (transacting) => {
            await AutomatedEmailRecipient.add({
                member_id: run.member_id,
                automated_email_id: run.automated_email_id,
                member_uuid: member.get('uuid'),
                member_email: member.get('email'),
                member_name: member.get('name')
            }, {transacting});

            // TODO(NY-1195): Advance to next email when there are additional ones

            await markExited(run.id, 'finished', transacting);
        });
    } catch (err) {
        logging.error(
            {
                system: {
                    event: 'welcome_email_automations.send_failed',
                    run_id: run.id
                },
                err
            },
            `${LOG_KEY} Failed to send welcome email for run ${run.id}`
        );

        if (run.step_attempts < MAX_ATTEMPTS) {
            const retryAt = new Date(Date.now() + RETRY_DELAY_MS);
            await markRetry(run.id, retryAt);
            enqueueAnotherPollAt(retryAt);
        } else {
            await markMaxAttemptsExceeded(run.id);
        }
    }
}

/**
 * Run automations that need it.
 *
 * Runs up to 100 in a batch. If that's met or exceeded, a request to poll
 * again is dispatched.
 *
 * @param {object} options
 * @param {MemberWelcomeEmailService} options.memberWelcomeEmailService
 * @param {() => unknown} options.enqueueAnotherPollNow
 * @param {(date: Readonly<Date>) => unknown} options.enqueueAnotherPollAt
 */
async function poll(options) {
    const {
        memberWelcomeEmailService,
        enqueueAnotherPollNow,
        enqueueAnotherPollAt
    } = options;
    const {runs, nextFutureReadyAt} = await fetchAndLockRuns();

    if (runs.length === 0) {
        if (nextFutureReadyAt) {
            enqueueAnotherPollAt(nextFutureReadyAt);
        }
        return;
    }

    memberWelcomeEmailService.init();
    await memberWelcomeEmailService.api.loadMemberWelcomeEmails();

    await Promise.allSettled(runs.map(run => processRun({run, ...options})));

    // If the batch is full, we might have another batch to execute. (There's
    // no way to know without trying.)
    if (runs.length >= MAX_RUNS_PER_BATCH) {
        enqueueAnotherPollNow();
    }
}

module.exports = {
    poll
};
