import moment from 'moment';
import {Transform, type Readable} from 'node:stream';
import type {Knex} from 'knex';

const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const {csvCellsForFields} = require('@tryghost/custom-field-types/csv');

// Options accepted by the export, forwarded to the members query for filtering.
export interface ExportOptions {
    limit?: number | 'all';
    filter?: string;
    search?: string;
    [option: string]: unknown;
}

// A custom field definition, opaque to the exporter: it only counts the set and hands
// it to the values codec, which decides the columns. Named for intent; its shape is
// the custom fields service's concern, not this one's.
export type CustomFieldDefinition = Record<string, unknown>;

// The custom fields collaborator: the active column set for this export, and the
// per-member values that fill those columns. Both resolve empty when the feature is
// off, so the exporter carries no flag of its own.
export interface CustomFieldsService {
    activeDefinitions(): Promise<CustomFieldDefinition[]>;
    valuesForMembers(memberIds: string[]): Promise<Map<string, Record<string, unknown>>>;
}

// The members aggregate, narrowed to the one read the export makes: the ids matching
// a filter, resolved without any of the related data the stream fetches itself.
export interface MembersRepository {
    findFilteredIds(options: ExportOptions): Promise<string[]>;
}

export interface ExporterDeps {
    knex: Knex;
    members: MembersRepository;
    customFields: CustomFieldsService;
}

// The related data for one batch of members, keyed by member id.
interface BatchRelatedData {
    tiersMap: Map<string, string>;
    labelsMap: Map<string, string>;
    stripeCustomerMap: Map<string, string>;
    subscribedSet: Set<string>;
    giftIdMap: Map<string, string>;
    customFieldValuesMap: Map<string, Record<string, unknown>>;
}

// The reference data read once up front and shared across every batch.
interface ReferenceData {
    allProducts: Record<string, string>;
    allLabels: Record<string, string>;
    activeCustomFields: CustomFieldDefinition[];
}

// A member row as the export query selects it -- the shape the stream emits.
interface MemberDbRow {
    id: string;
    email: string;
    name: string | null;
    note: string | null;
    status: string;
    created_at: Date | string;
}

// A flattened export row: the db row with its related data resolved onto it, as the
// output serializer reads it. custom_field_cells spreads into per-field columns.
interface MemberExportRow extends MemberDbRow {
    created_at: string;
    tiers: Array<{name: string}>;
    labels: Array<{name: string}>;
    subscribed: boolean;
    comped: boolean;
    complimentary_plan: boolean;
    gift_id: string | null;
    stripe_customer_id: string | null;
    custom_field_cells: Record<string, unknown>;
}

const BATCH_SIZE = 1000;

// Streams the members matching the options as flat rows, each carrying its related
// data (tiers, labels, subscription state, gift, Stripe customer, custom fields). The
// output serializer turns each row into a CSV line. knex is a first-class dependency;
// the members aggregate and the custom fields service are reached only through the
// ports above, so nothing Bookshelf- or flag-shaped leaks into the export itself.
export default class MembersCSVExporter {
    private _knex: Knex;
    private _members: MembersRepository;
    private _customFields: CustomFieldsService;

    constructor({knex, members, customFields}: ExporterDeps) {
        this._knex = knex;
        this._members = members;
        this._customFields = customFields;
    }

    async export(options: ExportOptions = {}): Promise<Readable> {
        const start = Date.now();
        const hasFilter = options.limit !== 'all' || options.filter || options.search;
        const ids = hasFilter ? await this._members.findFilteredIds(options) : null;
        if (ids) {
            logging.info(`[MembersExporter] Found ${ids.length} members matching filter criteria`);
        }

        const reference = await this.fetchReferenceData();

        const membersQuery = this._knex('members').select('id', 'email', 'name', 'note', 'status', 'created_at');
        if (ids) {
            membersQuery.whereIn('id', ids);
        }

        logging.info('[MembersExporter] Starting streaming export of members');
        const stream = membersQuery.stream()
            .pipe(this.createBatchingTransform())
            .pipe(this.createProcessingTransform(reference));

        stream.on('end', () => {
            logging.info('[MembersExporter] Total time taken for member export: ' + (Date.now() - start) / 1000 + 's');
        });

        return stream;
    }

    // products and labels are small, stable tables, read once up front as id->name
    // maps. Custom field definitions are read once too, which fixes the column set for
    // the whole file: archiving a field mid-export cannot leave the header ragged. It
    // can still leave that field's cells empty from the batch after the archive
    // onwards, because the per-batch value read applies its own active filter.
    private async fetchReferenceData(): Promise<ReferenceData> {
        const start = Date.now();

        const allProducts = await this._knex('products').select('id', 'name').then(rows => rows.reduce((acc: Record<string, string>, product: {id: string; name: string}) => {
            acc[product.id] = product.name;
            return acc;
        }, {}));

        const allLabels = await this._knex('labels').select('id', 'name').then(rows => rows.reduce((acc: Record<string, string>, label: {id: string; name: string}) => {
            acc[label.id] = label.name;
            return acc;
        }, {}));

        logging.info('[MembersExporter] Fetched products and labels in ' + (Date.now() - start) + 'ms');

        const activeCustomFields = await this._customFields.activeDefinitions();

        return {allProducts, allLabels, activeCustomFields};
    }

    // Group the member stream into batches so the related-data reads are one query per
    // batch rather than one per member.
    private createBatchingTransform(): Transform {
        let currentBatch: MemberDbRow[] = [];

        return new Transform({
            objectMode: true,
            // The stream emits rows shaped by the export query's select above.
            transform(member: MemberDbRow, encoding, callback) {
                currentBatch.push(member);

                if (currentBatch.length >= BATCH_SIZE) {
                    this.push(currentBatch);
                    currentBatch = [];
                }

                callback();
            },
            flush(callback) {
                if (currentBatch.length > 0) {
                    this.push(currentBatch);
                }
                callback();
            }
        });
    }

    // For each batch, read its related data and flatten it onto the member rows,
    // pushing each row individually to keep large arrays out of memory.
    private createProcessingTransform(reference: ReferenceData): Transform {
        const assembleRelatedData = (memberIds: string[]) => this.assembleRelatedData(memberIds, reference.activeCustomFields);
        const flattenBatch = (members: MemberDbRow[], related: BatchRelatedData) => this.flattenBatch(members, related, reference);

        return new Transform({
            objectMode: true,
            highWaterMark: BATCH_SIZE,
            async transform(batch: MemberDbRow[], encoding, callback) {
                try {
                    const memberIds = batch.map(member => member.id);
                    const related = await assembleRelatedData(memberIds);
                    const rows = flattenBatch(batch, related);
                    rows.forEach(row => this.push(row));
                    callback();
                } catch (err) {
                    callback(err instanceof Error ? err : new errors.InternalServerError({message: String(err)}));
                }
            }
        });
    }

    // One query per related table for the whole batch, reduced to lookup maps keyed by
    // member id. Custom field values are read only when there are columns to fill.
    private async assembleRelatedData(memberIds: string[], activeCustomFields: CustomFieldDefinition[]): Promise<BatchRelatedData> {
        const knex = this._knex;

        const [tiers, labels, stripeCustomers, subscriptions, gifts, customFieldValuesMap] = await Promise.all([
            knex('members_products')
                .select('member_id', knex.raw('GROUP_CONCAT(product_id) as tiers'))
                .whereIn('member_id', memberIds)
                .groupBy('member_id'),

            knex('members_labels')
                .select('member_id', knex.raw('GROUP_CONCAT(label_id) as labels'))
                .whereIn('member_id', memberIds)
                .groupBy('member_id'),

            knex('members_stripe_customers')
                .select('member_id', knex.raw('MIN(customer_id) as stripe_customer_id'))
                .whereIn('member_id', memberIds)
                .groupBy('member_id'),

            knex('members_newsletters')
                .distinct('member_id')
                .whereIn('member_id', memberIds),

            knex('gifts')
                .select('id', 'redeemer_member_id')
                .where('status', 'redeemed')
                .whereIn('redeemer_member_id', memberIds),

            activeCustomFields.length > 0
                ? this._customFields.valuesForMembers(memberIds)
                : new Map<string, Record<string, unknown>>()
        ]);

        return {
            tiersMap: new Map(tiers.map((row: {member_id: string; tiers: string}) => [row.member_id, row.tiers])),
            labelsMap: new Map(labels.map((row: {member_id: string; labels: string}) => [row.member_id, row.labels])),
            stripeCustomerMap: new Map(stripeCustomers.map((row: {member_id: string; stripe_customer_id: string}) => [row.member_id, row.stripe_customer_id])),
            subscribedSet: new Set(subscriptions.map((row: {member_id: string}) => row.member_id)),
            giftIdMap: new Map(gifts.map((row: {id: string; redeemer_member_id: string}) => [row.redeemer_member_id, row.id])),
            customFieldValuesMap
        };
    }

    // Resolve each member's related ids to their names and fold the batch's data onto
    // the row the serializer reads.
    private flattenBatch(members: MemberDbRow[], related: BatchRelatedData, reference: ReferenceData): MemberExportRow[] {
        const {tiersMap, labelsMap, stripeCustomerMap, subscribedSet, giftIdMap, customFieldValuesMap} = related;
        const {allProducts, allLabels, activeCustomFields} = reference;

        return members.map((row) => {
            const tierConcat = tiersMap.get(row.id);
            const tierIds = tierConcat ? tierConcat.split(',') : [];
            const labelConcat = labelsMap.get(row.id);
            const labelIds = labelConcat ? labelConcat.split(',') : [];

            return {
                ...row,
                subscribed: subscribedSet.has(row.id),
                comped: row.status === 'comped',
                complimentary_plan: row.status === 'complimentary',
                gift_id: giftIdMap.get(row.id) || null,
                stripe_customer_id: stripeCustomerMap.get(row.id) || null,
                created_at: moment(row.created_at).toISOString(),
                tiers: tierIds.map(id => ({name: allProducts[id]})),
                labels: labelIds.map(id => ({name: allLabels[id]})),
                // Flattened here rather than in the serializer because the column set is
                // only knowable from the database. Every member carries a cell for every
                // active field's column, so a member with no values still contributes the
                // full set -- the CSV header is taken from whichever row streams first.
                custom_field_cells: csvCellsForFields(activeCustomFields, customFieldValuesMap.get(row.id) || {})
            };
        });
    }
}
