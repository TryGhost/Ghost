import moment from 'moment-timezone';
import buildCompletionEmail from './members-import-email';
import type {Knex} from 'knex';
import type {MemberImportRow, ImportErrorRow, ImportLabel, Label} from './member-import-row';
import type {RowSpool, SpooledRows} from './members-import-spool';

const metrics = require('@tryghost/metrics');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const logging = require('@tryghost/logging');

// The members CSV importer, sliced into the concerns an import moves through:
//
//   process()          API adapter: read the request + its rows, run, shape response
//   importMembers()    orchestration: decide, then run the rows now or defer them
//   canImportInline()  routing: inline vs deferred from generic signals (size, cost)
//   importRows()       members kernel: create or update a member from each row
//   deferImport()      deferred work: resolve recipient, spool the rows, queue the job
//   runImportJob()     the queued job: import the spooled rows, notify, clean up
//
// process configures and reads the input -- today a CSV upload, via the injected
// readRows -- into a plain MemberImportRow array. From there orchestration is
// source-agnostic: importMembers takes rows, decides, and either imports them now or
// defers a job that reads the same rows back from a spool file. Both the CSV reader
// and the spool read produce a rows array, so the kernel just takes rows and a test
// can drive it from a literal array. The kernel yields only the result (the counts
// and the failed rows); shaping that into an email, error report and all, belongs to
// the email presenter (members-import-email). The rest is one collaborator per
// concern: the members aggregate it writes; the tiers, Stripe and gifts systems a
// member row also touches; the email it hands the result to (recipient and
// delivery); and background jobs. knex is a first-class dependency; no Bookshelf
// model or request frame is referenced below the boundary that owns it.

// The request frame this import path is handed, narrowed to what it reads.
interface ImportFrame {
    file: {path: string};
    data: {
        mapping?: Record<string, string>;
        // The input serializer normalises labels to {name} objects before this
        // path is reached, so they are never bare strings here.
        labels?: Label[];
    };
    user?: {get(field: string): string};
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
    reassignRedeemer(giftId: string, memberId: string, options: object): Promise<void>;
}

// The completion email concern: who it goes to, the links it carries, and sending
// it. The default recipient is the site owner, used when the request had no user.
export interface EmailNotifications {
    send(options: object): Promise<unknown>;
    getDefaultRecipient(): Promise<string>;
    urlFor(type: string, data: unknown, absolute: boolean): string;
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
    email: EmailNotifications;
    addJob: (job: {job: () => Promise<void>; offloaded: boolean; name: string}) => void;
    getTimezone: () => string;
    getInlineThreshold: () => number;
}

// The values built for one row and handed to the members repository.
interface MemberImportValues {
    email: unknown;
    name: unknown;
    note: unknown;
    subscribed: unknown;
    created_at: unknown;
    labels: Label[];
    newsletters?: unknown;
}

// The kernel does the importing, so it is what knows whether anything imported and,
// if so, which label the members were tagged with (a label is only persisted once
// attached to a member). The label is absent when nothing imported; the orchestrator
// reads it as null and never fetches it itself.
interface ImportResult {
    imported: number;
    errors: ImportErrorRow[];
    importLabel?: ImportLabel;
}

// What the domain service returns: an import that ran inline carries its stats and
// label for the response; a deferred one carries only the size accepted, because
// the work -- and its email -- finishes after the request is answered.
type ImportOutcome =
    | {deferred: false; originalImportSize: number; result: ImportResult}
    | {deferred: true; originalImportSize: number};

interface ProcessResult {
    meta: {
        originalImportSize: number;
        stats?: {imported: number; invalid: ImportErrorRow[]};
        import_label?: ImportLabel | null;
    };
}

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

// The outcome shaped into the API response: an inline import reports its stats and
// label, a deferred one reports only how much was accepted.
function toProcessResult(outcome: ImportOutcome): ProcessResult {
    if (outcome.deferred) {
        return {meta: {originalImportSize: outcome.originalImportSize}};
    }
    return {
        meta: {
            originalImportSize: outcome.originalImportSize,
            stats: {imported: outcome.result.imported, invalid: outcome.result.errors},
            import_label: outcome.result.importLabel ?? null
        }
    };
}

class MembersCSVImporter {
    private _knex: Knex;
    private _readRows: ReadRows;
    private _spool: RowSpool;
    private _members: MembersRepository;
    private _tiers: TiersRepository;
    private _stripe: StripeSubscriptions;
    private _gifts: GiftService;
    private _email: EmailNotifications;
    private _addJob: (job: {job: () => Promise<void>; offloaded: boolean; name: string}) => void;
    private _getTimezone: () => string;
    private _getInlineThreshold: () => number;

    constructor({knex, readRows, spool, members, tiers, stripe, gifts, email, addJob, getTimezone, getInlineThreshold}: ImporterDeps) {
        this._knex = knex;
        this._readRows = readRows;
        this._spool = spool;
        this._members = members;
        this._tiers = tiers;
        this._stripe = stripe;
        this._gifts = gifts;
        this._email = email;
        this._addJob = addJob;
        this._getTimezone = getTimezone;
        this._getInlineThreshold = getInlineThreshold;
    }

    // API adapter: read the request -- the rows, the extra labels, and who a deferred
    // import would email -- run the import, and shape the outcome into the response.
    // Owns knowing the input is a CSV, and the only place the frame is touched.
    async process(frame: ImportFrame, verificationTrigger: VerificationTrigger): Promise<ProcessResult> {
        const rows = await this._readRows(frame.file.path, frame.data.mapping);
        const extraLabels = frame.data.labels ?? [];
        // Null when the request carried no user; the deferred path then falls back to
        // the site owner.
        const requestUserEmail = frame.user ? frame.user.get('email') : null;
        const outcome = await this.importMembers(rows, {extraLabels, requestUserEmail}, verificationTrigger);
        return toProcessResult(outcome);
    }

    // The domain service: given the rows, decide how to run them, then import them now
    // or hand them to a background job. Agnostic to where the rows came from.
    private async importMembers(
        rows: MemberImportRow[],
        {extraLabels, requestUserEmail}: {extraLabels: Label[]; requestUserEmail: string | null},
        verificationTrigger: VerificationTrigger
    ): Promise<ImportOutcome> {
        const labelName = buildImportLabelName(this._getTimezone());

        if (canImportInline(rows.length, hasExpensiveColumns(rows), this._getInlineThreshold())) {
            const result = await this.importRows(rows, labelName, extraLabels);
            await verificationTrigger.testImportThreshold();
            return {deferred: false, originalImportSize: rows.length, result};
        }

        await this.deferImport(rows, {labelName, extraLabels, requestUserEmail}, verificationTrigger);
        return {deferred: true, originalImportSize: rows.length};
    }

    // Deferred work: resolve the recipient, spool the rows, and queue the import job.
    // Returns as soon as the job is enqueued; runImportJob does the work later.
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

    // The queued job: read the spooled rows, import them, email the result, and clean
    // up. A self-contained unit -- the shape a queued job handler would take -- so the
    // enqueue above stays a one-liner. Swallows its own errors: a failed import or
    // email must not leave the job rejected, and the verification trigger still runs.
    private async runImportJob(
        spooled: SpooledRows,
        {labelName, extraLabels, emailRecipient}: {labelName: string; extraLabels: Label[]; emailRecipient: string},
        verificationTrigger: VerificationTrigger
    ): Promise<void> {
        try {
            const spooledRows = await spooled.read();
            const result = await this.importRows(spooledRows, labelName, extraLabels);
            const importLabel = result.importLabel ?? null;
            await this._email.send(buildCompletionEmail({
                result,
                recipient: emailRecipient,
                labelName,
                importLabel,
                urlFor: this._email.urlFor
            }));
        } catch (e) {
            logging.error('Error in members import job');
            logging.error(e);
        } finally {
            await spooled.remove();
        }

        try {
            await verificationTrigger.testImportThreshold();
        } catch (e) {
            logging.error('Error in members import job when testing import threshold');
            logging.error(e);
        }
    }

    // ========================================================================
    // The members import kernel: create or update a member from each row in its
    // own transaction, collect the failures, and archive any Stripe prices an
    // import tier created. Shared by the inline and deferred branches.
    // ========================================================================
    private async importRows(rows: MemberImportRow[], labelName: string, extraLabels: Label[]): Promise<ImportResult> {
        const importLabel: Label = {name: labelName};
        const globalLabels: Label[] = [importLabel, ...extraLabels];
        const performStart = Date.now();
        const defaultTier = await this._tiers.getDefault();
        const tierIdCache = new Map();
        const archivableStripePriceIds: string[] = [];
        // Copied per row: the member model stamps ids and trims names onto these in
        // place, and each row runs in its own transaction that can roll back. A
        // caller can hand in a nameless label, which the model would drop anyway.
        const cloneGlobalLabels = (): Label[] => globalLabels
            .map(label => ({...label}))
            .filter(label => label.name);

        let imported = 0;
        const importErrors: ImportErrorRow[] = [];
        for (const row of rows) {
            const trx = await this._knex.transaction(undefined, {doNotRejectOnRollback: false});
            const options = {transacting: trx, context: IMPORT_CONTEXT};
            try {
                // The kernel operates on string columns; narrow the loose CSV values
                // once. A non-string cell (a header like email carrying 'true' coerces
                // to a boolean) reads as absent -- it cannot key a lookup and would fail
                // validation anyway.
                const email = typeof row.email === 'string' ? row.email : undefined;
                const importTier = typeof row.import_tier === 'string' ? row.import_tier : undefined;
                const giftId = typeof row.gift_id === 'string' ? row.gift_id : undefined;

                if (giftId) {
                    if (importTier) {
                        throw wrapGiftError(new errors.DataImportError({message: tpl(messages.giftCannotCombineWithImportTier)}));
                    }
                    if (row.complimentary_plan) {
                        throw wrapGiftError(new errors.DataImportError({message: tpl(messages.giftCannotCombineWithComplimentary)}));
                    }
                }

                const createdAtCell = typeof row.created_at === 'string' ? row.created_at : undefined;
                const createdAt = (createdAtCell && moment(createdAtCell).isAfter(moment())) ? moment().toDate() : row.created_at;
                const memberValues: MemberImportValues = {
                    email: row.email,
                    name: row.name,
                    note: row.note,
                    subscribed: row.subscribed,
                    created_at: createdAt,
                    labels: [...row.labels, ...cloneGlobalLabels()]
                };
                const existingMember = email !== undefined
                    ? await this._members.get({email}, {...options, withRelated: ['labels', 'newsletters']})
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
                if (importTier) {
                    if (!tierIdCache.has(importTier)) {
                        const tier = await this._tiers.getByName(importTier);
                        tierIdCache.set(importTier, tier ? tier.id.toString() : null);
                    }
                    importTierId = tierIdCache.get(importTier);
                    if (!importTierId) {
                        throw new errors.DataImportError({message: tpl(messages.invalidImportTier, {tier: importTier})});
                    }
                }

                if (row.stripe_customer_id && typeof row.stripe_customer_id === 'string') {
                    let stripeCustomerId;
                    if (row.stripe_customer_id.toLowerCase() === 'auto') {
                        stripeCustomerId = email !== undefined ? await this._members.getCustomerIdByEmail(email) : undefined;
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
                } else if (importTier) {
                    throw new errors.DataImportError({message: tpl(messages.freeMemberNotAllowedImportTier)});
                }

                if (giftId) {
                    try {
                        await this._gifts.reassignRedeemer(giftId, member.id, {transacting: trx});
                    } catch (giftError) {
                        throw wrapGiftError(giftError);
                    }
                }

                await trx.commit();
                imported += 1;
            } catch (error) {
                const errorList: unknown[] = Array.isArray(error) ? error : [error];
                const errorMessage = errorList
                    .map(e => (typeof e === 'object' && e !== null && 'message' in e ? e.message : undefined))
                    .join(', ');
                await trx.rollback();
                importErrors.push({...row, error: errorMessage});
            }
        }

        await Promise.all(archivableStripePriceIds.map(id => this._stripe.archivePrice(id)));
        metrics.metric('members-import', {imported, errors: importErrors.length, value: Date.now() - performStart});

        if (imported > 0) {
            // The import label exists now that members carry it, so fetch it to report.
            // Guarded against a null lookup in case a row is ever counted without it.
            const importLabelModel = await this._members.getImportLabel(labelName);
            return {imported, errors: importErrors, importLabel: importLabelModel?.toJSON()};
        }
        return {imported: 0, errors: importErrors};
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
