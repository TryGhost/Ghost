import assert from 'node:assert/strict';
import type {Knex} from 'knex';
import MembersCSVImporter from '../../../../../../../core/server/services/members/import-export/import/importer';
import type {MemberImportRow} from '../../../../../../../core/server/services/members/import-export/import/row';

const errors = require('@tryghost/errors');

// Asserted exactly rather than by pattern: the failure subject contains the word
// "completed", so a /complete/ match would pass for all three.
const COMPLETED = 'Your member import is complete';
const UNSUCCESSFUL = 'Your member import was unsuccessful';
const COULD_NOT_COMPLETE = 'Your member import could not be completed';

const expectedFailure = () => new errors.DataImportError({message: 'Member already exists'});

// A Stripe rejection as the importer sees one: the boundary has already attributed it to
// the row, so what arrives here is a Ghost error carrying Stripe's message.
const stripeRejection = () => new errors.DataImportError({message: 'No such customer: cus_missing'});

const defect = () => new TypeError("Cannot read properties of undefined (reading 'id')");

const row = (email: string): MemberImportRow => ({
    email,
    name: 'Test Member',
    note: undefined,
    subscribed: true,
    labels: [],
    id: undefined,
    complimentary_plan: undefined,
    stripe_customer_id: undefined,
    created_at: undefined,
    import_tier: undefined,
    gift_id: undefined
});

const member = (values: {name?: string; note?: string}) => ({
    id: 'member_1',
    name: values.name ?? '',
    note: values.note ?? '',
    related: () => ({toJSON: () => [], length: 0})
});

interface Reported {
    failure: {op: string; [fact: string]: unknown};
    error: unknown;
}

interface SentEmail {
    to: string;
    subject: string;
    html: string;
    attachments: Array<{filename: string; content: string}>;
}

// Collaborators are handed back as `deps` so a test can repoint the seam it is breaking.
function harness(
    rows: MemberImportRow[] = [row('first@example.com'), row('second@example.com')],
    // Zero sends every non-empty file down the deferred path.
    inlineThreshold = 0
) {
    const sent: SentEmail[] = [];
    const reported: Reported[] = [];
    const created: string[] = [];
    const createFailures = new Map<string, unknown>();
    const archivedPrices: string[] = [];
    const jobs: Array<{name: string; job: () => Promise<void>}> = [];
    let spoolRemoved = false;
    // The importer reads knex once, at construction, so a test cannot swap it afterwards.
    let rollback: () => Promise<void> = async () => {};
    let removalFailure: Error | undefined;

    const deps = {
        knex: {
            transaction: async () => ({commit: async () => {}, rollback: () => rollback()})
        } as unknown as Knex,
        readRows: async () => rows,
        spool: {
            write: async (spooledRows: MemberImportRow[]) => ({
                read: async () => spooledRows,
                remove: async () => {
                    spoolRemoved = true;
                    if (removalFailure) {
                        throw removalFailure;
                    }
                }
            })
        },
        members: {
            get: async () => null,
            create: async (values: {email?: string; name?: string; note?: string}) => {
                const failure = createFailures.get(values.email ?? '');
                if (failure) {
                    throw failure;
                }
                created.push(values.email ?? '');
                return member(values);
            },
            update: async (values: {name?: string; note?: string}) => member(values),
            getCustomerIdByEmail: async () => undefined,
            linkStripeCustomer: async () => {},
            getImportLabel: async (name: string) => ({toJSON: () => ({name, slug: 'import-2026-01-01'})})
        },
        tiers: {
            getDefault: async () => ({id: 'tier_default'}),
            getByName: async () => ({id: 'tier_named'})
        },
        stripe: {
            forceStripeSubscriptionToProduct: async () => ({isNewStripePrice: true, stripePriceId: 'price_1'}),
            archivePrice: async (id: string) => {
                archivedPrices.push(id);
            }
        },
        gifts: {
            reassignRedeemer: async () => {}
        },
        customFields: {
            activeFields: async () => [],
            planWrite: async () => [],
            applyWrite: async () => {}
        },
        email: {
            send: async (payload: SentEmail) => {
                sent.push(payload);
            },
            getDefaultRecipient: async () => 'owner@example.com',
            links: {
                siteUrl: () => new URL('http://localhost/'),
                membersUrl: (labelSlug?: string) => {
                    const url = new URL('http://localhost/ghost/members');
                    if (labelSlug) {
                        url.searchParams.set('label', labelSlug);
                    }
                    return url;
                }
            }
        },
        report: (failure: {op: string; [fact: string]: unknown}, error: unknown) => {
            reported.push({failure, error});
        },
        addJob: (job: {name: string; job: () => Promise<void>}) => {
            jobs.push(job);
        },
        getTimezone: () => 'Etc/UTC',
        getInlineThreshold: () => inlineThreshold
    };

    const importer = new MembersCSVImporter(deps);
    const noopVerification = {testImportThreshold: async () => {}};

    // The job is invoked directly rather than through the job manager.
    const run = async (verification = noopVerification) => {
        await importer.importCSV({filePath: 'members.csv', requestUserEmail: 'importer@example.com'}, verification);
        assert.equal(jobs.length, 1, 'expected the import to be deferred to a background job');
        await jobs[0].job();
    };

    return {
        deps,
        importer,
        run,
        sent,
        reported,
        created,
        archivedPrices,
        onlyEmail: () => {
            assert.equal(sent.length, 1, 'expected the publisher to be told exactly once');
            return sent[0];
        },
        reportedOperations: () => reported.map(entry => entry.failure.op),
        // Asserting the op alone leaves what was actually reported unchecked, which is
        // where a caught error becomes an array with no stack for the error tracker.
        reportOf: (op: string) => {
            const matches = reported.filter(entry => entry.failure.op === op);
            assert.equal(matches.length, 1, `expected exactly one ${op} report, got ${matches.length}`);
            return matches[0];
        },
        spoolRemoved: () => spoolRemoved,
        failRollbackWith: (error: Error) => {
            rollback = async () => {
                throw error;
            };
        },
        failSpoolRemovalWith: (error: Error) => {
            removalFailure = error;
        },
        failCreateFor: (email: string, error: unknown) => {
            createFailures.set(email, error);
        }
    };
}

// Carries enough Stripe and tier data to make the import create a price it must archive.
const rowNeedingPriceCleanup = (email: string): MemberImportRow => ({
    ...row(email),
    stripe_customer_id: 'cus_1',
    import_tier: 'Gold'
});

describe('members import error handling', function () {
    describe('a row that fails', function () {
        it('collects a row the publisher can fix and imports the rest', async function () {
            const h = harness();
            h.failCreateFor('first@example.com', expectedFailure());

            await h.run();

            assert.deepEqual(h.created, ['second@example.com']);
            const email = h.onlyEmail();
            assert.equal(email.subject, COMPLETED);
            assert.ok(email.html.includes(email.subject));
            assert.match(email.attachments[0].content, /first@example.com/);
            assert.match(email.attachments[0].content, /Member already exists/);
        });

        it('reports a row that failed for a reason the publisher cannot act on', async function () {
            const h = harness();
            h.failCreateFor('first@example.com', defect());

            await h.run();

            assert.ok(h.reportOf('row').error instanceof TypeError);
            assert.equal(h.onlyEmail().subject, COMPLETED);
        });

        it('tells the publisher the import failed when every row failed unexpectedly', async function () {
            const h = harness();
            h.deps.members.create = async () => {
                throw defect();
            };

            await h.run();

            const email = h.onlyEmail();
            assert.equal(email.subject, COULD_NOT_COMPLETE);
            assert.doesNotMatch(email.subject, /unsuccessful/);
            assert.ok(h.reportOf('row').error instanceof TypeError);
        });

        it('reports one of the reasons when a row fails for several at once', async function () {
            const h = harness();
            const reasons = [new TypeError('first reason'), new TypeError('second reason')];
            h.failCreateFor('first@example.com', reasons);

            await h.run();

            // A row can fail for several reasons at once, and the list of them is not
            // something an error tracker can read: it has no message and no stack.
            const reported = h.reportOf('row').error;
            assert.ok(reported instanceof Error, 'expected an error, not the list of reasons');
            assert.equal(reported, reasons[0]);
            // The publisher still gets every reason, in their report.
            const attached = h.onlyEmail().attachments[0].content;
            assert.match(attached, /first reason/);
            assert.match(attached, /second reason/);
        });

        it('reports a systematic row failure once rather than once per row', async function () {
            const h = harness([row('first@example.com'), row('second@example.com'), row('third@example.com')]);
            h.deps.members.create = async () => {
                throw defect();
            };

            await h.run();

            const summary = h.reported.filter(entry => entry.failure.op === 'row');
            assert.equal(summary.length, 1);
            assert.equal(summary[0].failure.failedRows, 3);
            assert.equal(summary[0].failure.totalRows, 3);
            assert.equal(h.reported.length, 1);
        });

        it('tells us when every row failed for a reason nothing anticipated', async function () {
            const h = harness();
            h.deps.members.create = async () => {
                throw Object.assign(new Error('ER_LOCK_WAIT_TIMEOUT_EXCEEDED'), {code: 'ER_LOCK_WAIT_TIMEOUT_EXCEEDED'});
            };

            await h.run();

            const summary = h.reportOf('row');
            assert.equal(summary.failure.failedRows, 2);
            assert.match((summary.error as Error).message, /ER_LOCK_WAIT_TIMEOUT_EXCEEDED/);
            // Nothing landed and nothing was the file's doing, so handing back a row per
            // line saying the table was locked would be blaming them for our outage.
            const email = h.onlyEmail();
            assert.equal(email.subject, COULD_NOT_COMPLETE);
            assert.deepEqual(email.attachments, []);
        });

        it('keeps the error report when every row was rejected by Stripe', async function () {
            const h = harness();
            h.deps.members.create = async () => {
                throw stripeRejection();
            };

            await h.run();

            const email = h.onlyEmail();
            assert.equal(email.subject, UNSUCCESSFUL);
            assert.match(email.attachments[0].content, /Could not find Stripe customer/);
            assert.deepEqual(h.reportedOperations(), []);
        });

        it('keeps the error report when only some failures were unattributed', async function () {
            const h = harness([row('first@example.com'), row('second@example.com')]);
            h.failCreateFor('first@example.com', defect());
            h.failCreateFor('second@example.com', expectedFailure());

            await h.run();

            const email = h.onlyEmail();
            assert.equal(email.subject, UNSUCCESSFUL);
            assert.match(email.attachments[0].content, /Member already exists/);
        });

        it('still blames the data when every row failed for a reason the publisher can fix', async function () {
            const h = harness();
            h.deps.members.create = async () => {
                throw expectedFailure();
            };

            await h.run();

            const email = h.onlyEmail();
            assert.equal(email.subject, UNSUCCESSFUL);
            assert.match(email.attachments[0].content, /Member already exists/);
        });
    });

    describe('a run that fails before writing anything', function () {
        it('writes nothing and tells the publisher the import did not run', async function () {
            const h = harness();
            h.deps.tiers.getDefault = async () => {
                throw new Error('Database is gone');
            };

            await h.run();

            assert.deepEqual(h.created, []);
            assert.equal(h.onlyEmail().subject, COULD_NOT_COMPLETE);
            assert.match((h.reportOf('run').error as Error).message, /Database is gone/);
        });

        it('attaches no error report to an import that never ran', async function () {
            const h = harness();
            h.deps.tiers.getDefault = async () => {
                throw new Error('Database is gone');
            };

            await h.run();

            const email = h.onlyEmail();
            assert.deepEqual(email.attachments, []);
            assert.match(email.html, /nothing wrong with your file/);
            assert.ok(email.html.includes(email.subject));
        });

        it('treats an unresolvable custom field set the same way', async function () {
            const h = harness();
            h.deps.customFields.activeFields = async () => {
                throw new Error('Custom fields unavailable');
            };

            await h.run();

            assert.deepEqual(h.created, []);
            assert.equal(h.onlyEmail().subject, COULD_NOT_COMPLETE);
        });

        it('tells the publisher when the spooled rows cannot be read back', async function () {
            const h = harness();
            h.deps.spool.write = async () => ({
                read: async (): Promise<MemberImportRow[]> => {
                    throw new Error('ENOENT: no such file or directory');
                },
                remove: async () => {}
            });

            await h.run();

            assert.deepEqual(h.created, []);
            assert.equal(h.onlyEmail().subject, COULD_NOT_COMPLETE);
            assert.match((h.reportOf('run').error as Error).message, /ENOENT/);
        });
    });

    describe('a run whose rollback fails', function () {
        it('reports a run of failed rollbacks once rather than once each', async function () {
            const h = harness([row('a@example.com'), row('b@example.com'), row('c@example.com')]);
            h.failRollbackWith(new Error('Connection lost'));
            h.deps.members.create = async () => {
                throw expectedFailure();
            };

            await h.run();

            const rollbacks = h.reported.filter(entry => entry.failure.op === 'rollback');
            assert.equal(rollbacks.length, 1);
            assert.equal(rollbacks[0].failure.failedRows, 3);
            assert.match((rollbacks[0].error as Error).message, /Connection lost/);
        });

        it('does not report an import that wrote members as one that never ran', async function () {
            const h = harness([row('first@example.com'), row('second@example.com'), row('third@example.com')]);
            h.failRollbackWith(new Error('Connection lost'));
            h.failCreateFor('second@example.com', expectedFailure());

            await h.run();

            assert.deepEqual(h.created, ['first@example.com', 'third@example.com']);
            assert.equal(h.onlyEmail().subject, COMPLETED);
            assert.match((h.reportOf('rollback').error as Error).message, /Connection lost/);
        });
    });

    describe('a run that fails after writing everything', function () {
        it('keeps a completed import completed when Stripe price cleanup fails', async function () {
            const h = harness([rowNeedingPriceCleanup('first@example.com')]);
            h.deps.stripe.archivePrice = async () => {
                throw new Error('Stripe is unreachable');
            };

            await h.run();

            assert.deepEqual(h.created, ['first@example.com']);
            const email = h.onlyEmail();
            assert.equal(email.subject, COMPLETED);
            assert.match(email.html, /import-2026-01-01/);
            const cleanup = h.reportOf('cleanup');
            assert.equal(cleanup.failure.step, 'archive-stripe-prices');
            // How many were left behind is the part worth alerting on, and the rejection
            // that caused it still has to reach whoever reads the alert. Ghost's errors
            // fold a cause in rather than exposing it, so the stack is where it survives.
            assert.match((cleanup.error as Error).message, /Failed to archive 1 of 1/);
            assert.match((cleanup.error as Error).stack ?? '', /Stripe is unreachable/);
        });

        it('archives the Stripe prices even when reading the label failed first', async function () {
            const h = harness([rowNeedingPriceCleanup('first@example.com')]);
            h.deps.members.getImportLabel = async () => {
                throw new Error('Label lookup failed');
            };

            await h.run();

            assert.deepEqual(h.archivedPrices, ['price_1']);
            assert.equal(h.onlyEmail().subject, COMPLETED);
        });

        it('still reports a completed import when the label lookup fails', async function () {
            const h = harness();
            h.deps.members.getImportLabel = async () => {
                throw new Error('Label lookup failed');
            };

            await h.run();

            assert.deepEqual(h.created, ['first@example.com', 'second@example.com']);
            assert.equal(h.onlyEmail().subject, COMPLETED);
            const cleanup = h.reportOf('cleanup');
            assert.equal(cleanup.failure.step, 'read-import-label');
            assert.match((cleanup.error as Error).message, /Label lookup failed/);
        });
    });

    describe('a failure that cannot be delivered', function () {
        it('reports a completion email that cannot be sent', async function () {
            const h = harness();
            h.deps.email.send = async () => {
                throw new Error('SMTP is down');
            };

            await h.run();

            assert.match((h.reportOf('notify').error as Error).message, /SMTP is down/);
        });

        it('reports a failing verification trigger without losing the email', async function () {
            const h = harness();

            await h.run({
                testImportThreshold: async () => {
                    throw new Error('Verification trigger failed');
                }
            });

            assert.equal(h.onlyEmail().subject, COMPLETED);
            assert.match((h.reportOf('verification').error as Error).message, /Verification trigger failed/);
        });
    });

    describe('whatever else fails', function () {
        it('always removes the spooled rows', async function () {
            const h = harness();
            h.deps.tiers.getDefault = async () => {
                throw new Error('Database is gone');
            };

            await h.run();

            assert.equal(h.spoolRemoved(), true);
        });

        it('reports rows left on disk without silencing the publisher', async function () {
            const h = harness();
            h.failSpoolRemovalWith(new Error('EACCES: permission denied'));

            await h.run();

            assert.equal(h.onlyEmail().subject, COMPLETED);
            const cleanup = h.reportOf('cleanup');
            assert.equal(cleanup.failure.step, 'remove-spooled-rows');
            assert.match((cleanup.error as Error).message, /EACCES/);
        });

        it('survives a spool that throws before it returns a promise', async function () {
            const h = harness();
            h.deps.spool.write = async (spooledRows: MemberImportRow[]) => ({
                read: async () => spooledRows,
                // Synchronous, so .catch() on the returned promise would never see it.
                remove: (() => {
                    throw new Error('EACCES: permission denied');
                }) as unknown as () => Promise<void>
            });

            await h.run();

            assert.equal(h.onlyEmail().subject, COMPLETED);
            assert.equal(h.reportOf('cleanup').failure.step, 'remove-spooled-rows');
        });

        it('never rejects the queued job', async function () {
            const h = harness();
            h.deps.tiers.getDefault = async () => {
                throw new Error('Database is gone');
            };
            h.deps.email.send = async () => {
                throw new Error('SMTP is down');
            };

            await assert.doesNotReject(() => h.run({
                testImportThreshold: async () => {
                    throw new Error('Verification trigger failed');
                }
            }));
        });
    });

    describe('an import with no request waiting on it', function () {
        const runInline = (h: ReturnType<typeof harness>) => h.importer.importInline(
            {filePath: 'members.csv', requestUserEmail: null},
            {testImportThreshold: async () => {}}
        );

        it('returns a run that produced nothing usable rather than raising', async function () {
            const h = harness();
            h.deps.members.create = async () => {
                throw defect();
            };

            // The site import runs every one of its importers inside a single transaction
            // with no catch between them, so raising here takes the posts, tags and users
            // imported alongside the members down with it.
            const result = await runInline(h);

            assert.equal(result.imported, 0);
            assert.equal(result.errors.length, 2);
        });

        it('reports what landed when the run completed', async function () {
            const h = harness();

            const result = await runInline(h);

            assert.equal(result.imported, 2);
            assert.deepEqual(result.errors, []);
        });
    });

    describe('an import that runs while the request is open', function () {
        it('surfaces a setup failure to the caller instead of swallowing it', async function () {
            const h = harness(undefined, 100);
            h.deps.tiers.getDefault = async () => {
                throw new Error('Database is gone');
            };

            await assert.rejects(
                () => h.importer.importCSV(
                    {filePath: 'members.csv', requestUserEmail: 'importer@example.com'},
                    {testImportThreshold: async () => {}}
                ),
                /Database is gone/
            );
            assert.equal(h.sent.length, 0);
        });

        it('answers with what landed when only the check after it failed', async function () {
            const h = harness(undefined, 100);

            // The members are already written by the time the threshold is tested, so a
            // failure there must not answer the request as though the import had not run.
            const outcome = await h.importer.importCSV(
                {filePath: 'members.csv', requestUserEmail: 'importer@example.com'},
                {testImportThreshold: async () => {
                    throw new Error('Verification trigger failed');
                }}
            );

            assert.equal(outcome.deferred, false);
            assert.equal(outcome.deferred === false && outcome.result.imported, 2);
            assert.match((h.reportOf('verification').error as Error).message, /Verification trigger failed/);
        });

        it('fails the request when the import produced nothing usable', async function () {
            const h = harness(undefined, 100);
            h.deps.members.create = async () => {
                throw defect();
            };

            await assert.rejects(
                () => h.importer.importCSV(
                    {filePath: 'members.csv', requestUserEmail: 'importer@example.com'},
                    {testImportThreshold: async () => {}}
                ),
                (error: Error) => {
                    // Admin only surfaces the message of a validation or data-import
                    // error; anything else reaches the publisher as "an unexpected error
                    // occurred", and both types carry this same message.
                    assert.equal((error as {errorType?: string}).errorType, 'DataImportError');
                    assert.match(error.message, /could not be completed/);
                    return true;
                }
            );
            assert.deepEqual(h.created, []);
        });

        it('still answers with the failed rows when the publisher can fix them', async function () {
            const h = harness(undefined, 100);
            h.deps.members.create = async () => {
                throw expectedFailure();
            };

            const outcome = await h.importer.importCSV(
                {filePath: 'members.csv', requestUserEmail: 'importer@example.com'},
                {testImportThreshold: async () => {}}
            );

            assert.equal(outcome.deferred, false);
            assert.equal(outcome.deferred === false && outcome.result.errors.length, 2);
        });

        it('does not fail the request when only the cleanup after it failed', async function () {
            const h = harness(undefined, 100);
            h.deps.members.getImportLabel = async () => {
                throw new Error('Label lookup failed');
            };

            const outcome = await h.importer.importCSV(
                {filePath: 'members.csv', requestUserEmail: 'importer@example.com'},
                {testImportThreshold: async () => {}}
            );

            assert.equal(outcome.deferred, false);
            assert.equal(outcome.deferred === false && outcome.result.imported, 2);
            assert.equal(outcome.deferred === false && outcome.result.importLabel, undefined);
            assert.equal(h.reportOf('cleanup').failure.step, 'read-import-label');
        });
    });
});
