import assert from 'node:assert/strict';
import type {Knex} from 'knex';
import MembersCSVImporter from '../../../../../../../core/server/services/members/import-export/import/importer';
import type {MemberImportRow} from '../../../../../../../core/server/services/members/import-export/import/row';

const errors = require('@tryghost/errors');

// An import fails in strata, and each one owes the publisher something different. A cell
// fails its row; a row is collected and reported back as data the publisher can fix; the
// run either produced a result or did not; and when even the telling fails there is
// nobody left to tell but us. This suite drives every stratum through the importer's
// injected collaborators -- each one is a seam a failure can be thrown from -- so nothing
// here stubs a module or reaches past the ports the importer declares.

// The three subjects an import can send. Asserted exactly rather than by pattern, because
// the failure subject contains the word "completed": a /complete/ match passes for all
// three and would prove nothing.
const COMPLETED = 'Your member import is complete';
const UNSUCCESSFUL = 'Your member import was unsuccessful';
const COULD_NOT_COMPLETE = 'Your member import could not be completed';

// A failure the import anticipates: the publisher's data is wrong, and the row can say so
// in terms they can act on.
const expectedFailure = () => new errors.DataImportError({message: 'Member already exists'});

// A row rejected by Stripe: not a Ghost error, since the Stripe SDK's own error travels
// all the way up unwrapped, but still entirely about the row.
const stripeRejection = () => Object.assign(new Error('No such customer: cus_missing'), {type: 'StripeInvalidRequestError'});

// A defect on our side, which the publisher can neither understand nor fix.
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

// A member as the import loop reads one back: relations are loaded before it looks at
// them, so related() is always answerable.
const member = (values: {name?: string; note?: string}) => ({
    id: 'member_1',
    name: values.name ?? '',
    note: values.note ?? '',
    related: () => ({toJSON: () => [], length: 0})
});

interface Reported {
    operation: string;
    error: unknown;
    context?: Record<string, unknown>;
}

interface SentEmail {
    to: string;
    subject: string;
    html: string;
    attachments: Array<{filename: string; content: string}>;
}

// Builds an importer whose every collaborator is a fake a test can make throw. The
// collaborators are handed back as `deps` so a test names the seam it is breaking
// (`deps.tiers.getDefault = ...`) rather than reaching inside the importer.
function harness(
    rows: MemberImportRow[] = [row('first@example.com'), row('second@example.com')],
    // Zero sends every non-empty file down the deferred path, which is the one that has
    // to report by email. Raised only by the test that wants the inline path.
    inlineThreshold = 0
) {
    const sent: SentEmail[] = [];
    const reported: Reported[] = [];
    const created: string[] = [];
    const jobs: Array<{name: string; job: () => Promise<void>}> = [];
    let spoolRemoved = false;
    // The importer reads knex once, at construction, so a test cannot swap it afterwards.
    // Rolling back goes through this instead, which a test can repoint at any time.
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
            archivePrice: async () => {}
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
            urlFor: (type: string) => (type === 'admin' ? 'http://localhost/ghost/' : 'http://localhost/')
        },
        // Where a failure goes when it cannot be shown to the publisher.
        report: (operation: string, error: unknown, context?: Record<string, unknown>) => {
            reported.push({operation, error, context});
        },
        addJob: (job: {name: string; job: () => Promise<void>}) => {
            jobs.push(job);
        },
        getTimezone: () => 'Etc/UTC',
        getInlineThreshold: () => inlineThreshold
    };

    const importer = new MembersCSVImporter(deps);
    const noopVerification = {testImportThreshold: async () => {}};

    // Accept the import, then run the job the deferred path queued. Splitting the two is
    // the point: everything this suite is about happens after the request has been
    // answered, so the job is invoked directly rather than through the job manager.
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
        onlyEmail: () => {
            assert.equal(sent.length, 1, 'expected the publisher to be told exactly once');
            return sent[0];
        },
        reportedOperations: () => reported.map(entry => entry.operation),
        spoolRemoved: () => spoolRemoved,
        failRollbackWith: (error: Error) => {
            rollback = async () => {
                throw error;
            };
        },
        failSpoolRemovalWith: (error: Error) => {
            removalFailure = error;
        }
    };
}

// A row carrying enough Stripe and tier data to make the import create a price it has to
// archive once the loop is done -- the one piece of work that happens after every member
// is already written.
const rowNeedingPriceCleanup = (email: string): MemberImportRow => ({
    ...row(email),
    stripe_customer_id: 'cus_1',
    import_tier: 'Gold'
});

describe('members import error handling', function () {
    describe('a row that fails', function () {
        it('collects a row the publisher can fix and imports the rest', async function () {
            const h = harness();
            h.deps.members.create = async (values: {email?: string; name?: string; note?: string}) => {
                if (values.email === 'first@example.com') {
                    throw expectedFailure();
                }
                h.created.push(values.email ?? '');
                return member(values);
            };

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
            h.deps.members.create = async (values: {email?: string; name?: string; note?: string}) => {
                if (values.email === 'first@example.com') {
                    throw defect();
                }
                h.created.push(values.email ?? '');
                return member(values);
            };

            await h.run();

            assert.ok(h.reportedOperations().includes('row'), 'expected the unexpected row failure to be reported');
            // One row still imported, so the file itself is fine and the usual report of
            // what did and did not land is still the honest thing to send.
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
            // Blaming their file would be wrong: nothing in it caused this.
            assert.doesNotMatch(email.subject, /unsuccessful/);
            assert.ok(h.reportedOperations().includes('row'));
        });

        it('reports a systematic row failure once rather than once per row', async function () {
            const h = harness([row('first@example.com'), row('second@example.com'), row('third@example.com')]);
            h.deps.members.create = async () => {
                throw defect();
            };

            await h.run();

            // Whatever fails one row this way fails every one, so a report per row would
            // be thousands of copies of one exception. It goes out once, after the loop,
            // when how widespread it was is finally known.
            const summary = h.reported.filter(entry => entry.operation === 'row');
            assert.equal(summary.length, 1);
            assert.equal(summary[0].context?.failedRows, 3);
            assert.equal(summary[0].context?.totalRows, 3);
        });

        it('keeps the error report when every row was rejected by Stripe', async function () {
            const h = harness();
            h.deps.members.create = async () => {
                throw stripeRejection();
            };

            await h.run();

            // A stale customer id is the publisher's to fix, and the Stripe SDK error is
            // not a Ghost error -- so treating "not a Ghost error" as our fault would strip
            // them of the one report that tells them which rows to correct, and tell them
            // their file was fine. Nothing about this row failure is ours.
            const email = h.onlyEmail();
            assert.equal(email.subject, UNSUCCESSFUL);
            assert.match(email.attachments[0].content, /Could not find Stripe customer/);
            assert.equal(h.reported.length, 0);
        });

        it('keeps the error report when a row failed converting its own values', async function () {
            const h = harness();
            h.deps.members.create = async () => {
                throw new RangeError('Invalid time value');
            };

            await h.run();

            // A cell can reach a date conversion or a parse, so a RangeError may well be
            // describing the row rather than the code. Counting it as a defect would take
            // away the report naming the row to fix and tell them their file was fine.
            const email = h.onlyEmail();
            assert.equal(email.subject, UNSUCCESSFUL);
            assert.match(email.attachments[0].content, /Invalid time value/);
            assert.equal(h.reported.length, 0);
        });

        it('keeps the error report when only some of the failures were defects', async function () {
            const h = harness([row('first@example.com'), row('second@example.com')]);
            h.deps.members.create = async (values: {email?: string}) => {
                throw values.email === 'first@example.com' ? defect() : expectedFailure();
            };

            await h.run();

            // One row the publisher can act on is reason enough to send the report; the
            // rows they can fix are worth more to them than the noise of the one they
            // cannot.
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
            assert.ok(h.reportedOperations().includes('run'));
        });

        it('attaches no error report to an import that never ran', async function () {
            const h = harness();
            h.deps.tiers.getDefault = async () => {
                throw new Error('Database is gone');
            };

            await h.run();

            // The whole point of the separate email: an attached CSV, and the copy that
            // comes with it, tells the publisher to fix rows and re-upload. There is
            // nothing in the file to fix.
            const email = h.onlyEmail();
            assert.deepEqual(email.attachments, []);
            assert.match(email.html, /nothing wrong with your file/);
            // The subject and the heading inside are the same sentence, so an email that
            // says one thing in the inbox and another when opened cannot ship.
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
            assert.ok(h.reportedOperations().includes('run'));
        });
    });

    describe('a run whose rollback fails', function () {
        it('does not report an import that wrote members as one that never ran', async function () {
            const h = harness([row('first@example.com'), row('second@example.com'), row('third@example.com')]);
            h.failRollbackWith(new Error('Connection lost'));
            h.deps.members.create = async (values: {email?: string; name?: string; note?: string}) => {
                if (values.email === 'second@example.com') {
                    throw expectedFailure();
                }
                h.created.push(values.email ?? '');
                return member(values);
            };

            // A rejected rollback escaping the row handler would abandon the remaining rows
            // and leave the job reporting no result at all -- telling the publisher nothing
            // was imported after the first row had already been committed.
            await h.run();

            assert.deepEqual(h.created, ['first@example.com', 'third@example.com']);
            assert.equal(h.onlyEmail().subject, COMPLETED);
            assert.ok(h.reportedOperations().includes('cleanup'));
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
            // The member is imported. A leftover price is ours to clean up, not something
            // to trouble the publisher with or to retract a successful import over.
            const email = h.onlyEmail();
            assert.equal(email.subject, COMPLETED);
            // The whole settling phase shares one guard, so the work the publisher can see
            // has to happen before the work only we can: their email still links at the
            // members that landed.
            assert.match(email.html, /import-2026-01-01/);
            assert.ok(h.reportedOperations().includes('cleanup'));
        });

        it('still reports a completed import when the label lookup fails', async function () {
            const h = harness();
            h.deps.members.getImportLabel = async () => {
                throw new Error('Label lookup failed');
            };

            await h.run();

            assert.deepEqual(h.created, ['first@example.com', 'second@example.com']);
            assert.equal(h.onlyEmail().subject, COMPLETED);
            assert.ok(h.reportedOperations().includes('cleanup'));
        });
    });

    describe('a failure that cannot be delivered', function () {
        it('reports a completion email that cannot be sent', async function () {
            const h = harness();
            h.deps.email.send = async () => {
                throw new Error('SMTP is down');
            };

            await h.run();

            // Nothing left to tell the publisher with, so it is only ours to see.
            assert.ok(h.reportedOperations().includes('notify'));
        });

        it('reports a failing verification trigger without losing the email', async function () {
            const h = harness();

            await h.run({
                testImportThreshold: async () => {
                    throw new Error('Verification trigger failed');
                }
            });

            assert.equal(h.onlyEmail().subject, COMPLETED);
            assert.ok(h.reportedOperations().includes('verification'));
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

            // The spooled file holds member names, emails and Stripe customer ids, so one
            // left behind is worth knowing about. It is still only ours to chase: the
            // import itself worked and the publisher hears the usual result.
            assert.equal(h.onlyEmail().subject, COMPLETED);
            assert.ok(h.reportedOperations().includes('cleanup'));
        });

        it('never rejects the queued job', async function () {
            const h = harness();
            h.deps.tiers.getDefault = async () => {
                throw new Error('Database is gone');
            };
            h.deps.email.send = async () => {
                throw new Error('SMTP is down');
            };

            // The job manager treats a rejected inline job as a defect in the job itself,
            // so the import owes it a resolved promise no matter what went wrong.
            await assert.doesNotReject(() => h.run({
                testImportThreshold: async () => {
                    throw new Error('Verification trigger failed');
                }
            }));
        });
    });

    describe('an import that runs while the request is open', function () {
        it('surfaces a setup failure to the caller instead of swallowing it', async function () {
            const h = harness(undefined, 100);
            h.deps.tiers.getDefault = async () => {
                throw new Error('Database is gone');
            };

            // The request is still open, so the API can report this properly. Only the
            // deferred path has to turn a failure into an email.
            await assert.rejects(
                () => h.importer.importCSV(
                    {filePath: 'members.csv', requestUserEmail: 'importer@example.com'},
                    {testImportThreshold: async () => {}}
                ),
                /Database is gone/
            );
            assert.equal(h.sent.length, 0);
        });

        it('does not fail the request when only the cleanup after it failed', async function () {
            const h = harness(undefined, 100);
            h.deps.members.getImportLabel = async () => {
                throw new Error('Label lookup failed');
            };

            // Both members are written by the time the label is read back, so failing the
            // request would report a completed import as an error. The label is only there
            // to link the response at the imported members, so the import reports itself
            // without one.
            const outcome = await h.importer.importCSV(
                {filePath: 'members.csv', requestUserEmail: 'importer@example.com'},
                {testImportThreshold: async () => {}}
            );

            assert.equal(outcome.deferred, false);
            assert.equal(outcome.deferred === false && outcome.result.imported, 2);
            assert.equal(outcome.deferred === false && outcome.result.importLabel, undefined);
            assert.ok(h.reportedOperations().includes('cleanup'));
        });
    });
});
