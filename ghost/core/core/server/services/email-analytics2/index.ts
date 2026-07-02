import * as mailgunjs from 'mailgun.js/definitions';
import {batch} from './batch';

type MailgunClient = mailgunjs.Interfaces.IMailgunClient;

type Operation = {
    memberId: string;
    emailId: string;
    delivered: boolean;
    opened: boolean;
    failed: boolean;
    unsubscribed: boolean;
    complained: boolean;
};

async function* getMailgunEvents({
    mailgunClient
}: {
    mailgunClient: MailgunClient;
}): AsyncGenerator<mailgunjs.LogsEventItem, void, never> {
    // TODO(ea2) Implement this.
    // See <https://github.com/mailgun/mailgun.js#logs> and <https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/logs/post-v1-analytics-logs>.
    // Endless loop that fetches logs from Mailgun and yields them as they are fetched, then waits, then fetches more logs, etc. Persist the last log timestamp so that we can fetch logs in batches and not miss any logs.
    // - Fetch logs from Mailgun with `mailgunClient.logs.list()`.
        // - Use `start` and `end` to fetch logs in batches. Or use `duration` instead of `end`.
        // - Use `events` to filter to delivered OR opened OR failed OR unsubscribed OR complained
        // - Consider filtering by domains.
        // - Handle pagination.
    // - Yield (or preferably, `yield*`) the logs as they are fetched.
    // - Error handling:
        // - If Mailgun is down (request timeout, network error, 5xx error), retry with exponential backoff.
        // - Fatal errors should throw an error and stop the generator, but those should indicate developer mistakes here, NOT Mailgun being down or other things that can happen as part of normal operation.
}

function mailgunEventsToOperations(mailgunEvents: ReadonlyArray<mailgunjs.LogsEventItem>): Operation[] {
}

async function* getOperations({
    mailgunClient
}: {
    mailgunClient: MailgunClient;
}): AsyncGenerator<Operation, void, never> {
    const mailgunEvents = getMailgunEvents({
        mailgunClient
    });
    const mailgunEventBatches = batch(mailgunEvents, {maxSize: 100, maxWait: 1000});
    for await (const mailgunEventBatch of mailgunEventBatches) {
        yield* mailgunEventsToOperations(mailgunEventBatch);
    }
}

async function runOperation(operation: Operation) {
}

export async function init(options: {
    mailgunClient: MailgunClient;
}) {
    const operations = getOperations({
        mailgunClient: options.mailgunClient
    });
    for await (const operation of operations) {
        runOperation(operation).catch((err) => {
            // TODO(ea2) Log this error
            console.error(err);
        });
    }
}