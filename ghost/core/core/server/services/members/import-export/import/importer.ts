import moment from 'moment-timezone';
import buildImportEmail, {type EmailLinks} from './completion-email';
import {stripFormulaGuard} from '../csv';
import {fieldValuesFromCsvRow, type CsvField} from '@tryghost/custom-field-types/csv';
import type {Knex} from 'knex';
import type {MemberImportRow, ImportErrorRow, ImportLabel, Label} from './row';
import type {RowSpool, SpooledRows} from './spool';

const metrics = require('@tryghost/metrics');
const errors = require('@tryghost/errors');
const jobLogging = require('../../../jobs/job-logging');
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
    links: EmailLinks;
}

// Must not throw: it is called from catch and finally blocks that exist to stop an error
// escaping.
export type FailureReporter = (error: unknown) => void;

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

// The label is absent when nothing imported: it is only persisted once a member carries it.
interface ImportResult {
    imported: number;
    errors: ImportErrorRow[];
    importLabel?: ImportLabel;
}

interface PreparedRun {
    defaultTier: Tier;
    activeCustomFields: CsvField[];
    globalLabels: Label[];
}

interface WrittenRows {
    imported: number;
    errors: ImportErrorRow[];
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
            const result = await this.importRows(rows, labelName, extraLabels, verificationTrigger);
            return {deferred: false, originalImportSize: rows.length, result};
        }

        await this.deferImport(rows, {labelName, extraLabels, requestUserEmail: request.requestUserEmail}, verificationTrigger);
        return {deferred: true, originalImportSize: rows.length};
    }

    async importInline(request: ImportRequest, verificationTrigger: VerificationTrigger): Promise<ImportResult> {
        const rows = await this._readRows(request.filePath, request.mapping);
        return this.importRows(rows, buildImportLabelName(this._getTimezone()), request.extraLabels ?? [], verificationTrigger);
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

        jobLogging.info('[Background Job] members-import queued');
        this._addJob({
            job: () => this.runImportJob(spooled, {labelName, extraLabels, emailRecipient}, verificationTrigger),
            offloaded: false,
            name: 'members-import'
        });
    }

    // Must resolve in every case: the job manager reads a rejected inline job as a defect
    // in the job itself, and there is no retry behind it.
    private async runImportJob(
        spooled: SpooledRows,
        {labelName, extraLabels, emailRecipient}: {labelName: string; extraLabels: Label[]; emailRecipient: string},
        verificationTrigger: VerificationTrigger
    ): Promise<void> {
        const startedAt = Date.now();
        jobLogging.info('[Background Job] members-import started');
        // Null until the import produces one: parsing and mapping already happened inside
        // the request, so anything failing from here is ours rather than the file's.
        let result: ImportResult | null = null;
        try {
            const spooledRows = await spooled.read();
            result = await this.importRows(spooledRows, labelName, extraLabels, verificationTrigger);
        } catch (error) {
            // importRows only throws before its write loop, so nothing was written.
            this._report(error);
        } finally {
            await this.settle(() => spooled.remove());
        }

        // Whatever became of it, the publisher hears exactly once. If this is what fails,
        // there is nobody left to tell but us.
        await this.settle(() => this._email.send(buildImportEmail({
            result,
            recipient: emailRecipient,
            labelName,
            links: this._email.links
        })));

        if (result) {
            jobLogging.info(`[Background Job] members-import completed in ${Date.now() - startedAt}ms: imported ${result.imported}, ${result.errors.length} row(s) rejected`);
        } else {
            jobLogging.info(`[Background Job] members-import failed after ${Date.now() - startedAt}ms`);
        }
    }

    // Only the write itself may throw. Callers rely on that to tell an import that never
    // ran from one that ran and then failed to tidy up after itself.
    private async importRows(
        rows: MemberImportRow[],
        labelName: string,
        extraLabels: Label[],
        verificationTrigger: VerificationTrigger
    ): Promise<ImportResult> {
        const startedAt = Date.now();
        const prepared = await this.prepareRun(labelName, extraLabels);
        const written = await this.writeRows(rows, prepared);
        const result: ImportResult = {imported: written.imported, errors: written.errors};

        // Bookkeeping, and the publisher's result is already in hand. Nothing below is
        // load-bearing for what they are told, so it is left to throw into one report
        // rather than each step defending itself. The label is read first because only
        // it reaches the publisher, as the link their email arrives with.
        await this.settle(async () => {
            if (written.imported > 0) {
                result.importLabel = (await this._members.getImportLabel(labelName))?.toJSON();
            }
            await metrics.metric('members-import', {
                imported: written.imported,
                errors: written.errors.length,
                value: Date.now() - startedAt
            });
            await this.archiveStripePrices(written.archivableStripePriceIds);
            await verificationTrigger.testImportThreshold();
        });

        return result;
    }

    private async prepareRun(labelName: string, extraLabels: Label[]): Promise<PreparedRun> {
        return {
            defaultTier: await this._tiers.getDefault(),
            // Empty when the feature is off, so a carried-through column is dropped.
            activeCustomFields: await this._customFields.activeFields(),
            globalLabels: [{name: labelName}, ...extraLabels]
        };
    }

    // Must not throw: once a row has committed, an import that failed halfway is not one
    // that never ran.
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
        let rollbackFailures = 0;
        let firstRollbackFailure: unknown;
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
                        firstRollbackFailure ??= rollbackError;
                        rollbackFailures += 1;
                    }
                }
                importErrors.push({...row, error: errorMessage, errors: reasons});
            }
        }

        if (rollbackFailures > 0) {
            this._report(new errors.InternalServerError({
                message: `Failed to roll back ${rollbackFailures} of ${rows.length} member rows`,
                err: firstRollbackFailure
            }));
        }

        return {imported, errors: importErrors, archivableStripePriceIds};
    }

    private async settle<T>(work: () => T | Promise<T>): Promise<T | undefined> {
        try {
            return await work();
        } catch (error) {
            this._report(error);
            return undefined;
        }
    }


    private async archiveStripePrices(priceIds: string[]): Promise<void> {
        // allSettled so one unarchivable price neither hides the others nor stops them
        // being attempted.
        const attempts = await Promise.allSettled(priceIds.map(id => this._stripe.archivePrice(id)));
        const failed = attempts.filter(attempt => attempt.status === 'rejected');
        if (failed.length > 0) {
            throw new errors.InternalServerError({
                message: `Failed to archive ${failed.length} of ${attempts.length} Stripe prices created by this import`,
                err: failed[0].reason
            });
        }
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
