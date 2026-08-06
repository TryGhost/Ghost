import moment from 'moment-timezone';
import buildCompletionEmail, {buildFailureEmail} from './completion-email';
import {stripFormulaGuard} from '../csv';
import {fieldValuesFromCsvRow, type CsvField} from '@tryghost/custom-field-types/csv';
import type {Knex} from 'knex';
import type {MemberImportRow, ImportErrorRow, ImportLabel, Label} from './row';
import type {RowSpool, SpooledRows} from './spool';

const metrics = require('@tryghost/metrics');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

// The members CSV importer, sliced into one concern per method. Two entry points by
// design: importCSV decides inline-vs-deferred by load, since a large import must not
// hold a request open; importInline always runs now, for callers with no request to
// protect (the Revue data import). The kernel takes a plain MemberImportRow array -- the
// CSV reader and the deferred spool both produce one -- so a test can drive it from a
// literal array. Collaborators are injected one per concern; knex is first-class, and no
// Bookshelf model is referenced below the boundary that owns it.

// The import service's arguments, built by the endpoint from the request frame.
// requestUserEmail is null when the request carried no user, so the deferred path falls
// back to the site owner.
export interface ImportRequest {
    filePath: string;
    mapping?: Record<string, string>;
    extraLabels?: Label[];
    requestUserEmail: string | null;
}

interface VerificationTrigger {
    testImportThreshold(): Promise<void>;
}

// A tier, narrowed to the id the import reads off it.
export interface Tier {
    id: {toString(): string};
}

// A member model, narrowed to what the import loop touches. Relations are loaded
// via withRelated before the loop reads them, so related() is treated as present.
interface MemberModel {
    id: string;
    name: string;
    note: string;
    related(relation: string): {toJSON(): Array<{name: string}>; length: number};
}

// Reads a source into import rows. The CSV reader is the only implementation today;
// a test can inject one that returns a fixed rows array with no file involved.
type ReadRows = (path: string, mapping?: Record<string, string>) => Promise<MemberImportRow[]>;

// The members aggregate: the one thing the import writes. Its methods are the
// member operations a row performs, plus the import label lookup, which is a
// member-tagging concern rather than a store of its own. Hides the Member and
// Label models behind the shape the import needs.
export interface MembersRepository {
    get(data: {email?: string}, options: object): Promise<MemberModel | null>;
    create(values: object, options: object): Promise<MemberModel>;
    update(values: object, options: object): Promise<MemberModel>;
    getCustomerIdByEmail(email: string): Promise<string | undefined>;
    linkStripeCustomer(data: {customer_id: string; member_id: string}, options: object): Promise<void>;
    getImportLabel(name: string): Promise<{toJSON(): ImportLabel} | null>;
}

// Tiers: the tier catalog, an aggregate of its own, consulted to resolve the
// default tier and a tier a row names.
interface TiersRepository {
    getDefault(): Promise<Tier>;
    getByName(name: string): Promise<Tier | null>;
}

// Stripe: the external subscription work a row with Stripe data triggers.
interface StripeSubscriptions {
    forceStripeSubscriptionToProduct(
        args: {customer_id: string; product_id?: string},
        options: object
    ): Promise<{isNewStripePrice: boolean; stripePriceId: string}>;
    archivePrice(stripePriceId: string): Promise<void>;
}

// Gifts: reassigning a redeemed gift to the imported member.
export interface GiftService {
    reassignRedeemer(giftId: string, memberId: string, options: {transacting?: Knex.Transaction}): Promise<void>;
}

// The completion email concern: who it goes to, the links it carries, and sending
// it. The default recipient is the site owner, used when the request had no user.
export interface EmailNotifications {
    send(options: object): Promise<unknown>;
    getDefaultRecipient(): Promise<string>;
    urlFor(type: string, data: unknown, absolute: boolean): string;
}

// Where a failure goes when the publisher cannot be shown it: a defect that failed rows,
// cleanup that did not finish after they were already told, or the notification itself
// failing to send. Everything reported here is an operator concern; the composition root
// decides where it surfaces.
//
// Must not throw. It is called from every failure path, including inside catch and finally
// blocks whose whole purpose is to stop an error escaping.
export type FailureReporter = (operation: string, error: unknown, context?: Record<string, unknown>) => void;

// Opaque to the import: planWrite produces it, applyWrite consumes it.
type CustomFieldPlan = unknown;

// The custom fields collaborator as the import needs it. activeFields is the field set a
// custom_fields.* column is read against, empty when the feature is off; planWrite
// validates a row's values (throwing so the row fails whole) and applyWrite persists
// them, touching only the parts the row named, both on the row's transaction.
export interface CustomFieldsImport {
    activeFields(): Promise<CsvField[]>;
    planWrite(values: Record<string, unknown>): Promise<CustomFieldPlan[]>;
    applyWrite(memberId: string, plan: CustomFieldPlan[], executor: Knex): Promise<void>;
}

// The collaborators the import depends on, one per concern.
interface ImporterDeps {
    knex: Knex;
    readRows: ReadRows;
    spool: RowSpool;
    members: MembersRepository;
    tiers: TiersRepository;
    stripe: StripeSubscriptions;
    gifts: GiftService;
    customFields: CustomFieldsImport;
    email: EmailNotifications;
    report: FailureReporter;
    addJob: (job: {job: () => Promise<void>; offloaded: boolean; name: string}) => void;
    getTimezone: () => string;
    getInlineThreshold: () => number;
}

// The values built for one row and handed to the members repository. Indexed off
// MemberImportRow so a change to the import schema surfaces here: rename or retype a
// field the kernel writes and this stops compiling until the mapping is updated. name
// and note may be replaced with the existing member's values (both strings, already in
// range); created_at may be clamped to now when the row dates a member in the future;
// newsletters is opaque ORM relation JSON, an honest unknown at the model boundary.
interface MemberImportValues {
    email: MemberImportRow['email'];
    name: MemberImportRow['name'];
    note: MemberImportRow['note'];
    subscribed: MemberImportRow['subscribed'];
    created_at: MemberImportRow['created_at'] | Date;
    labels: Label[];
    newsletters?: unknown;
}

// What a run that produced something reports, and the only shape that leaves the
// sub-domain. The label is absent when nothing imported, since a label is only persisted
// once a member carries it.
interface ImportResult {
    imported: number;
    errors: ImportErrorRow[];
    importLabel?: ImportLabel;
}

// How a run turned out, as the three things that can be true of one rather than a result
// that may be absent with a counter beside it to say whether it was any use. The one
// decision this drives -- what the publisher is told -- becomes a match on the status
// instead of a condition reassembled at the point of asking.
type ImportRun =
    | {status: 'not-run'}
    | {status: 'no-usable-result'; errors: ImportErrorRow[]}
    | ({status: 'completed'} & ImportResult);

// What every row in a run is written against, gathered once before the first write.
interface PreparedRun {
    defaultTier: Tier;
    activeCustomFields: CsvField[];
    globalLabels: Label[];
}

// What writing the rows produced. Carries the Stripe prices an import tier created, which
// only the settling phase acts on, and the defect tally that decides whether the run
// produced anything the publisher can act on.
interface WrittenRows {
    imported: number;
    errors: ImportErrorRow[];
    defects: number;
    archivableStripePriceIds: string[];
}

// What the domain service returns: an import that ran inline carries its stats and
// label for the response; a deferred one carries only the size accepted, because
// the work -- and its email -- finishes after the request is answered.
export type ImportOutcome =
    | {deferred: false; originalImportSize: number; result: ImportResult}
    | {deferred: true; originalImportSize: number};

const messages = {
    freeMemberNotAllowedImportTier: 'You cannot import a free member with a specified tier.',
    invalidImportTier: '"{tier}" is not a valid tier.',
    giftCannotCombineWithImportTier: 'Cannot specify both gift_id and import_tier.',
    giftCannotCombineWithComplimentary: 'Cannot specify both gift_id and complimentary_plan.',
    giftReassignFailed: 'Failed to reassign gift to member.'
};

// Columns whose presence makes a row slow to import (they reach out to Stripe), so
// a file carrying any of them is deferred regardless of size. The routing decision
// only ever sees the boolean this produces, never the column names themselves.
const EXPENSIVE_COLUMNS = ['stripe_customer_id'];

// The context each repository call runs under: the import identifies itself, and a
// created member is additionally flagged as imported so downstream hooks can tell.
const IMPORT_CONTEXT = {importer: true};
const CREATE_CONTEXT = {import: true};

// The import label members are tagged with, named for the request time. Shared by
// the kernel (the label) and the deferred email (the error CSV filename).
function buildImportLabelName(timezone: string): string {
    return `Import ${moment().tz(timezone).format('YYYY-MM-DD HH:mm')}`;
}

function hasExpensiveColumns(rows: MemberImportRow[]): boolean {
    return rows.some(row => EXPENSIVE_COLUMNS.some(column => !!row[column]));
}

// The runtime types JavaScript raises when the code itself is wrong. Nothing a publisher
// puts in a CSV produces one. RangeError and SyntaxError are deliberately absent: a cell
// can reach a date conversion or a parse, so either could describe the row rather than the
// code, and a row wrongly called a defect loses the publisher their error report.
const DEFECT_TYPES = [TypeError, ReferenceError];

// A row failure that is unambiguously ours rather than the row's. Everything else -- a
// Ghost validation error, a Stripe customer that does not exist, a database constraint --
// describes something about the row, and the error report puts it back in front of the
// publisher to fix; completion-email humanises the raw Stripe and ORM messages precisely
// because they are meant to be read.
//
// Deliberately narrow, because the two ways of being wrong do not cost the same. Treating
// a real data problem as a defect takes away the report the publisher needs and tells them
// their file is fine when it is not. Letting one of our bugs through into that report only
// shows them a message they cannot act on, which is what happens today. Bookshelf surfaces
// validation as an array, so a batch qualifies only if every error in it does.
function isDefect(error: unknown): boolean {
    const raised: unknown[] = Array.isArray(error) ? error : [error];
    return raised.length > 0 && raised.every(one => DEFECT_TYPES.some(type => one instanceof type));
}

// An import that landed nothing and failed only through defects of ours. Their file is not
// at fault, so the error report would tell them nothing they can use.
// The run as a caller holding an open request reads it. An import that landed nothing
// still answers with what it tried, because that is what the response has always carried.
function resultFor(run: ImportRun): ImportResult {
    if (run.status === 'completed') {
        return {imported: run.imported, errors: run.errors, importLabel: run.importLabel};
    }
    return {imported: 0, errors: run.status === 'no-usable-result' ? run.errors : []};
}

function producedNothingUsable(written: WrittenRows): boolean {
    return written.imported === 0
        && written.errors.length > 0
        && written.defects === written.errors.length;
}

// The routing decision, in terms it can reason about without knowing what a member
// or a Stripe customer is: an empty or small, cheap file imports inline (an empty
// one simply imports nothing); a large one, or one carrying expensive columns, is
// too slow to hold a request open, so it is deferred to a background job.
function canImportInline(rowCount: number, expensive: boolean, inlineThreshold: number): boolean {
    return rowCount <= inlineThreshold && !expensive;
}

class MembersCSVImporter {
    private _knex: Knex;
    private _readRows: ReadRows;
    private _spool: RowSpool;
    private _members: MembersRepository;
    private _tiers: TiersRepository;
    private _stripe: StripeSubscriptions;
    private _gifts: GiftService;
    private _customFields: CustomFieldsImport;
    private _email: EmailNotifications;
    private _report: FailureReporter;
    private _addJob: (job: {job: () => Promise<void>; offloaded: boolean; name: string}) => void;
    private _getTimezone: () => string;
    private _getInlineThreshold: () => number;

    constructor({knex, readRows, spool, members, tiers, stripe, gifts, customFields, email, report, addJob, getTimezone, getInlineThreshold}: ImporterDeps) {
        this._knex = knex;
        this._readRows = readRows;
        this._spool = spool;
        this._members = members;
        this._tiers = tiers;
        this._stripe = stripe;
        this._gifts = gifts;
        this._customFields = customFields;
        this._email = email;
        this._report = report;
        this._addJob = addJob;
        this._getTimezone = getTimezone;
        this._getInlineThreshold = getInlineThreshold;
    }

    async importCSV(request: ImportRequest, verificationTrigger: VerificationTrigger): Promise<ImportOutcome> {
        const rows = await this._readRows(request.filePath, request.mapping);
        const labelName = buildImportLabelName(this._getTimezone());
        const extraLabels = request.extraLabels ?? [];

        if (canImportInline(rows.length, hasExpensiveColumns(rows), this._getInlineThreshold())) {
            const run = await this.importRows(rows, labelName, extraLabels);
            await verificationTrigger.testImportThreshold();
            return {deferred: false, originalImportSize: rows.length, result: resultFor(run)};
        }

        await this.deferImport(rows, {labelName, extraLabels, requestUserEmail: request.requestUserEmail}, verificationTrigger);
        return {deferred: true, originalImportSize: rows.length};
    }

    async importInline(request: ImportRequest, verificationTrigger: VerificationTrigger): Promise<ImportResult> {
        const rows = await this._readRows(request.filePath, request.mapping);
        const run = await this.importRows(rows, buildImportLabelName(this._getTimezone()), request.extraLabels ?? []);
        await verificationTrigger.testImportThreshold();
        return resultFor(run);
    }

    private async deferImport(
        rows: MemberImportRow[],
        {labelName, extraLabels, requestUserEmail}: {labelName: string; extraLabels: Label[]; requestUserEmail: string | null},
        verificationTrigger: VerificationTrigger
    ): Promise<void> {
        // Resolved here, not at the API boundary, so the owner lookup only runs when
        // a request without a user actually reaches the deferred path.
        const emailRecipient: string = requestUserEmail ?? await this._email.getDefaultRecipient();
        const spooled = await this._spool.write(rows);

        this._addJob({
            job: () => this.runImportJob(spooled, {labelName, extraLabels, emailRecipient}, verificationTrigger),
            offloaded: false,
            name: 'members-import'
        });
    }

    // The deferred import, and the one thing the publisher hears about it. The request was
    // answered long ago, so an email is the only way to reach them and it has to go out
    // whatever happened. Resolves in every case: the job manager reads a rejected inline
    // job as a defect in the job itself, and there is no retry behind it either way.
    private async runImportJob(
        spooled: SpooledRows,
        {labelName, extraLabels, emailRecipient}: {labelName: string; extraLabels: Label[]; emailRecipient: string},
        verificationTrigger: VerificationTrigger
    ): Promise<void> {
        let run: ImportRun = {status: 'not-run'};
        try {
            const spooledRows = await spooled.read();
            run = await this.importRows(spooledRows, labelName, extraLabels);
        } catch (error) {
            // importRows guards everything after its write loop, so a throw reaching here
            // means the import stopped before any member was written.
            this._report('run', error);
        } finally {
            // Guarded here rather than trusted to the spool: anything thrown in a finally
            // replaces whatever the try produced, so an unremovable file would both
            // silence the publisher and reject the job. try/catch rather than .catch(),
            // which would still let a synchronous throw past.
            try {
                await spooled.remove();
            } catch (error) {
                this._report('cleanup', error, {step: 'remove-spooled-rows'});
            }
        }

        await this.reportOutcome(run, {labelName, emailRecipient});

        try {
            await verificationTrigger.testImportThreshold();
        } catch (error) {
            this._report('verification', error);
        }
    }

    // Tell the publisher how their import went. A run that produced no result, or one
    // that landed nothing and failed only in ways they cannot act on, is reported as an
    // import that could not be completed: handing them an error report in either case
    // would blame a file that was never the problem.
    private async reportOutcome(
        run: ImportRun,
        {labelName, emailRecipient}: {labelName: string; emailRecipient: string}
    ): Promise<void> {
        try {
            const email = run.status === 'completed'
                ? buildCompletionEmail({
                    result: run,
                    recipient: emailRecipient,
                    labelName,
                    importLabel: run.importLabel ?? null,
                    urlFor: this._email.urlFor
                })
                : buildFailureEmail({recipient: emailRecipient, urlFor: this._email.urlFor});
            await this._email.send(email);
        } catch (error) {
            // There is no longer anyone to tell but us.
            this._report('notify', error);
        }
    }

    // The members import kernel, shared by the inline and deferred paths, in three phases:
    // gather what the rows are written against, write them, then settle up. Only the first
    // may throw, so a throw out of here always means the import stopped before a single
    // member was written -- which is what lets the deferred path tell an import that never
    // ran from one that ran and then failed to tidy up.
    private async importRows(rows: MemberImportRow[], labelName: string, extraLabels: Label[]): Promise<ImportRun> {
        const startedAt = Date.now();
        const prepared = await this.prepareRun(labelName, extraLabels);
        const written = await this.writeRows(rows, prepared);
        return this.settleRun(written, {labelName, startedAt});
    }

    // Gather the facts every row is written against. The one phase allowed to fail:
    // nothing has been written yet, so a failure here is an import that did not happen.
    private async prepareRun(labelName: string, extraLabels: Label[]): Promise<PreparedRun> {
        return {
            defaultTier: await this._tiers.getDefault(),
            // The field set a custom_fields.* column is read against; empty when the
            // feature is off, so a carried-through column is dropped and the write
            // boundary stays shut.
            activeCustomFields: await this._customFields.activeFields(),
            globalLabels: [{name: labelName}, ...extraLabels]
        };
    }

    // Write the members, each in its own transaction so one row's failure rolls back only
    // itself. Reports what happened rather than throwing: once a row has committed, an
    // import that failed halfway is not one that never ran, and saying so would be a lie.
    private async writeRows(rows: MemberImportRow[], prepared: PreparedRun): Promise<WrittenRows> {
        const {defaultTier, activeCustomFields} = prepared;
        const tierIdCache = new Map();
        const archivableStripePriceIds: string[] = [];
        // Copied per row: the member model stamps ids and trims names onto these in
        // place, and each row runs in its own transaction that can roll back. A
        // caller can hand in a nameless label, which the model would drop anyway.
        const cloneGlobalLabels = (): Label[] => prepared.globalLabels
            .map(label => ({...label}))
            .filter(label => label.name);

        let imported = 0;
        let defects = 0;
        let firstDefect: unknown;
        const importErrors: ImportErrorRow[] = [];
        for (const row of rows) {
            let trx: Knex.Transaction | undefined;
            try {
                if (row.gift_id) {
                    if (row.import_tier) {
                        throw wrapGiftError(new errors.DataImportError({message: tpl(messages.giftCannotCombineWithImportTier)}));
                    }
                    if (row.complimentary_plan) {
                        throw wrapGiftError(new errors.DataImportError({message: tpl(messages.giftCannotCombineWithComplimentary)}));
                    }
                }

                // Validate the row's custom field values before the transaction opens.
                // planWrite only reads, and it throws on an invalid value to fail the row
                // before any member write -- so there is no reason to hold a transaction
                // across it, and doing so would deadlock the single-connection SQLite pool.
                const customFieldPlan = activeCustomFields.length > 0
                    ? await namingTheColumn(() => this._customFields.planWrite(fieldValuesFromCsvRow(activeCustomFields, row, stripFormulaGuard)))
                    : [];

                trx = await this._knex.transaction(undefined, {doNotRejectOnRollback: false});
                const options = {transacting: trx, context: IMPORT_CONTEXT};

                const createdAt = (row.created_at && moment(row.created_at).isAfter(moment())) ? moment().toDate() : row.created_at;
                const memberValues: MemberImportValues = {
                    email: row.email,
                    name: row.name,
                    note: row.note,
                    subscribed: row.subscribed,
                    created_at: createdAt,
                    labels: [...row.labels, ...cloneGlobalLabels()]
                };
                const existingMember = row.email
                    ? await this._members.get({email: row.email}, {...options, withRelated: ['labels', 'newsletters']})
                    : null;
                let member;
                if (existingMember) {
                    const existingLabels = existingMember.related('labels').toJSON();
                    const existingNewsletters = existingMember.related('newsletters');
                    if (existingNewsletters.length > 0 && memberValues.subscribed) {
                        memberValues.newsletters = existingNewsletters.toJSON();
                    }
                    if (!existingNewsletters.length && memberValues.subscribed) {
                        memberValues.subscribed = false;
                    }
                    if (!row.name) {
                        memberValues.name = existingMember.name;
                    }
                    if (!row.note) {
                        memberValues.note = existingMember.note;
                    }
                    member = await this._members.update({
                        ...memberValues,
                        labels: existingLabels.concat(memberValues.labels)
                    }, {...options, id: existingMember.id});
                } else {
                    member = await this._members.create(memberValues, Object.assign({}, options, {context: CREATE_CONTEXT}));
                }

                let importTierId;
                if (row.import_tier) {
                    if (!tierIdCache.has(row.import_tier)) {
                        const tier = await this._tiers.getByName(row.import_tier);
                        tierIdCache.set(row.import_tier, tier ? tier.id.toString() : null);
                    }
                    importTierId = tierIdCache.get(row.import_tier);
                    if (!importTierId) {
                        throw new errors.DataImportError({message: tpl(messages.invalidImportTier, {tier: row.import_tier})});
                    }
                }

                if (row.stripe_customer_id) {
                    let stripeCustomerId;
                    if (row.stripe_customer_id.toLowerCase() === 'auto') {
                        stripeCustomerId = row.email ? await this._members.getCustomerIdByEmail(row.email) : undefined;
                    } else {
                        stripeCustomerId = row.stripe_customer_id;
                    }
                    if (stripeCustomerId) {
                        if (row.import_tier) {
                            const {isNewStripePrice, stripePriceId} = await this._stripe.forceStripeSubscriptionToProduct({
                                customer_id: stripeCustomerId,
                                product_id: importTierId
                            }, options);
                            if (isNewStripePrice) {
                                archivableStripePriceIds.push(stripePriceId);
                            }
                        }
                        await this._members.linkStripeCustomer({customer_id: stripeCustomerId, member_id: member.id}, options);
                    }
                } else if (row.complimentary_plan) {
                    const products = [];
                    if (row.import_tier) {
                        products.push({id: importTierId});
                    } else {
                        products.push({id: defaultTier.id.toString()});
                    }
                    await this._members.update({products}, {...options, id: member.id});
                } else if (row.import_tier) {
                    throw new errors.DataImportError({message: tpl(messages.freeMemberNotAllowedImportTier)});
                }

                if (row.gift_id) {
                    try {
                        await this._gifts.reassignRedeemer(row.gift_id, member.id, {transacting: trx});
                    } catch (giftError) {
                        throw wrapGiftError(giftError);
                    }
                }

                // On the row's transaction, so the values commit or roll back with the member.
                await this._customFields.applyWrite(member.id, customFieldPlan, trx);

                await trx.commit();
                imported += 1;
            } catch (error) {
                const errorList: unknown[] = Array.isArray(error) ? error : [error];
                const reasons = errorList
                    .map(e => (typeof e === 'object' && e !== null && 'message' in e ? e.message : undefined))
                    .filter((message): message is string => typeof message === 'string');
                const errorMessage = reasons.join('\n');
                // trx is unset if the row failed before the transaction opened (a bad
                // custom field value or gift combination). A rejected rollback must not
                // escape: rows before this one are already committed, and a throw leaving
                // here would be read as an import that never wrote anything.
                if (trx) {
                    try {
                        await trx.rollback();
                    } catch (rollbackError) {
                        this._report('cleanup', rollbackError, {step: 'roll-back-row'});
                    }
                }
                // The row is collected either way, so one defect cannot stop the rest of
                // the file importing. Counted rather than reported one by one: whatever
                // causes one defect causes every one, so a report per row would be
                // thousands of copies of the same exception.
                if (isDefect(error)) {
                    firstDefect ??= error;
                    defects += 1;
                }
                importErrors.push({...row, error: errorMessage, errors: reasons});
            }
        }

        // One report per run, once the extent is known. How widespread a defect was is the
        // part worth alerting on, and reporting it here rather than per row keeps a single
        // exception from arriving thousands of times over.
        if (defects > 0) {
            this._report('row', firstDefect, {failedRows: defects, totalRows: rows.length});
        }

        return {imported, errors: importErrors, defects, archivableStripePriceIds};
    }

    // Settle up once every member is already written. Nothing here can change what was
    // imported, so nothing here may escape: a Stripe hiccup or a failed lookup must not
    // turn a completed import into one the publisher is told never happened. One guard for
    // the phase rather than one per step, so work added here is covered by default.
    private async settleRun(
        written: WrittenRows,
        {labelName, startedAt}: {labelName: string; startedAt: number}
    ): Promise<ImportRun> {
        const result: ImportResult = {
            imported: written.imported,
            errors: written.errors
        };

        // Ordered by what it costs the publisher to lose. One guard for the phase means a
        // step that throws takes the rest of the phase with it, so the label their email
        // links to is read first and the Stripe prices only we care about are archived
        // last -- an unreachable Stripe leaves the email whole.
        try {
            if (written.imported > 0) {
                // The import label exists now that members carry it, so fetch it to
                // report. A null lookup leaves the result without one, which the email
                // reads as a link it cannot offer.
                const importLabelModel = await this._members.getImportLabel(labelName);
                if (importLabelModel) {
                    result.importLabel = importLabelModel.toJSON();
                }
            }
            metrics.metric('members-import', {
                imported: written.imported,
                errors: written.errors.length,
                value: Date.now() - startedAt
            });
            await Promise.all(written.archivableStripePriceIds.map(id => this._stripe.archivePrice(id)));
        } catch (error) {
            this._report('cleanup', error);
        }

        // Classified last, so the settling above still happens for a run that produced
        // nothing: the prices are archived and the metric is recorded either way.
        if (producedNothingUsable(written)) {
            return {status: 'no-usable-result', errors: written.errors};
        }
        return {status: 'completed', ...result};
    }
}

// A row error is read next to a spreadsheet, and a value rejection states only what the
// value should be — the same sentence Admin shows under a single input, where the field is
// already on screen. `property` is the dotted path a default export writes as its column
// header, so prefixing with it names the column a publisher has to go and fix.
//
// A rejection about the whole request carries the bare namespace and names no field after
// it, so it is left alone rather than made to point at a column that does not exist.
async function namingTheColumn<T>(plan: () => Promise<T>): Promise<T> {
    try {
        return await plan();
    } catch (error) {
        const {property, message} = (error ?? {}) as {property?: unknown; message?: unknown};
        const namesAField = typeof property === 'string' && property.includes('.');
        if (!namesAField || typeof message !== 'string') {
            throw error;
        }
        throw new errors.DataImportError({message: `${property}: ${message}`});
    }
}

function wrapGiftError(error: unknown) {
    const err = error as {message?: unknown};
    const message = (err && typeof err.message === 'string' && err.message) || tpl(messages.giftReassignFailed);
    return new errors.DataImportError({
        message: `Member cannot be assigned to a gift: ${message}`
    });
}

export default MembersCSVImporter;
