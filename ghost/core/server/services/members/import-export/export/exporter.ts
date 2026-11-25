import moment from 'moment';
import { Readable, Transform } from 'node:stream';
import { finished, pipeline } from 'node:stream/promises';
import type { Knex } from 'knex';
import { csvCellsForFields, type CsvField } from '@tryghost/metafield-csv';
import type { ImportExportTracking } from '../tracking';

const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');

// Options accepted by the export, forwarded to the members query for filtering.
export interface ExportOptions {
  limit?: number | 'all';
  filter?: string;
  search?: string;
  [option: string]: unknown;
}

// A member's metafield values, by namespace and then key, as the columns are filled from.
type MemberValues = Record<string, Record<string, unknown>>;

// The metafields collaborator: the active column set for this export, and the
// per-member values that fill those columns. Both resolve empty when the feature is
// off, so the exporter carries no flag of its own.
export interface MetafieldsService {
  activeDefinitions(): Promise<CsvField[]>;
  valuesForMembers(memberIds: string[], executor: Knex): Promise<Map<string, MemberValues>>;
}

// The members aggregate applies the same filter and search rules as Admin browse.
export interface MembersRepository {
  canReadFilteredBatches(options: ExportOptions): boolean;
  findFilteredIds(options: ExportOptions): Promise<string[]>;
  openFilteredBatchReader(
    options: ExportOptions,
    transacting: Knex.Transaction,
  ): Promise<
    (columns: Array<keyof MemberDbRow>, limit: number, afterId?: string) => Promise<MemberDbRow[]>
  >;
}

export interface ExporterDeps {
  knex: Knex;
  members: MembersRepository;
  metafields: MetafieldsService;
  tracking: ImportExportTracking;
}

interface BatchRelatedData {
  tiersMap: Map<string, string>;
  labelsMap: Map<string, string>;
  stripeCustomerMap: Map<string, string>;
  subscribedSet: Set<string>;
  giftIdMap: Map<string, string>;
  metafieldValuesMap: Map<string, MemberValues>;
}

// The reference data read once up front and shared across every batch.
interface ReferenceData {
  allProducts: Record<string, string>;
  allLabels: Record<string, string>;
  activeMetafields: CsvField[];
}

// A member row as the export query selects it -- the shape the stream emits, and the
// contract flattenBatch is total over. Its value types are declared here (knex streams
// rows untyped); a change to the members table that this export should carry is made by
// changing this type, which then ripples into flattenBatch until every field is handled.
// The end-to-end e2e export test is what catches the table drifting from this shape.
interface MemberDbRow {
  id: string;
  email: string;
  name: string | null;
  note: string | null;
  status: string;
  created_at: Date | string;
}

// The columns the export reads off the members table, checked against MemberDbRow so the
// query cannot select a column the row type does not declare.
const MEMBER_COLUMNS = ['id', 'email', 'name', 'note', 'status', 'created_at'] satisfies Array<
  keyof MemberDbRow
>;

// The db row with its related data resolved onto it. metafield_cells later spreads
// into one column per active metafield.
interface MemberExportRow extends MemberDbRow {
  created_at: string;
  tiers: Array<{ name: string }>;
  labels: Array<{ name: string }>;
  subscribed: boolean;
  comped: boolean;
  gift_id: string | null;
  stripe_customer_id: string | null;
  metafield_cells: Record<string, unknown>;
}

// One row of the members export CSV: a flattened export row encoded into cells. This
// type is the export's column contract -- the output serializer takes the columns from
// these keys. The fixed member columns are typed; metafield_cells spreads in whatever
// per-site columns the database holds, so the row also carries an open string index.
type ExportCsvRow = {
  id: string;
  email: string;
  name: string | null;
  note: string | null;
  subscribed_to_emails: string;
  complimentary_plan: string;
  stripe_customer_id: string | null;
  created_at: string;
  deleted_at: null;
  labels: string;
  tiers: string;
  gift_id: string;
} & Record<string, unknown>;

function namesToCsv(items: Array<{ name: string }>): string {
  return items.map((item) => item.name).join(',');
}

// Encode a flattened export row into its CSV cells, type-checked against MemberExportRow:
// a change to that row must be handled here or this stops compiling. deleted_at is always
// null -- the export reads live members -- and complimentary_plan is written from comped.
export function toExportCsvRow(row: MemberExportRow): ExportCsvRow {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    note: row.note,
    subscribed_to_emails: row.subscribed === true ? 'true' : 'false',
    complimentary_plan: row.comped === true ? 'true' : '',
    stripe_customer_id: row.stripe_customer_id,
    created_at: row.created_at,
    deleted_at: null,
    labels: namesToCsv(row.labels),
    tiers: namesToCsv(row.tiers),
    gift_id: row.gift_id || '',
    ...row.metafield_cells,
  };
}

const BATCH_SIZE = 1000;

// Streams the matching members as flat rows, each carrying its related data (tiers,
// labels, subscription, gift, Stripe customer, metafields) for the output serializer
// to turn into CSV lines. The members aggregate and metafields are reached only
// through the ports above, so nothing Bookshelf- or flag-shaped leaks into the export.
export default class MembersCSVExporter {
  private _knex: Knex;
  private _members: MembersRepository;
  private _metafields: MetafieldsService;
  private _tracking: ImportExportTracking;
  private snapshotExportRunning = false;

  constructor({ knex, members, metafields, tracking }: ExporterDeps) {
    this._knex = knex;
    this._members = members;
    this._metafields = metafields;
    this._tracking = tracking;
  }

  async export(options: ExportOptions = {}): Promise<Readable> {
    const filtered = Boolean(options.filter || options.search);
    const batched = filtered && this._members.canReadFilteredBatches(options);
    if (!batched) {
      return this.startExport(options, filtered, false);
    }

    if (this.snapshotExportRunning) {
      throw new errors.TooManyRequestsError({
        message: 'A filtered member export is already running. Try again after it finishes.',
      });
    }
    this.snapshotExportRunning = true;
    try {
      return await this.startExport(options, filtered, true);
    } catch (error) {
      this.snapshotExportRunning = false;
      throw error;
    }
  }

  private async startExport(options: ExportOptions, filtered: boolean, batched: boolean) {
    const start = Date.now();
    const reference = await this.fetchReferenceData();
    const ids = filtered && !batched ? await this._members.findFilteredIds(options) : null;

    logging.info(
      { event: { name: 'members-export.started' } },
      'Starting streaming export of members',
    );
    const attempt = this._tracking.export(reference.activeMetafields);
    let rowsWritten = 0;
    let batchesWritten = 0;
    const snapshot = batched ? await this.openFilteredSnapshot(options) : null;
    let processingTransform: Transform;
    try {
      processingTransform = this.createProcessingTransform(
        reference,
        (rows) => {
          rowsWritten += rows;
          batchesWritten += 1;
          attempt.wrote(rows);
        },
        snapshot?.transaction ?? this._knex,
      );
    } catch (error) {
      await snapshot?.close();
      throw error;
    }

    // Over once the reader has taken every row, not once the last one is buffered for it, so a
    // small export that fits in the buffer still counts as broken off if its download is.
    const streamed = (
      snapshot
        ? pipeline(Readable.from(snapshot.batches), processingTransform).finally(async () => {
            try {
              await snapshot.close();
            } finally {
              this.snapshotExportRunning = false;
            }
          })
        : pipeline(
            this._knex('members')
              .select(...MEMBER_COLUMNS)
              .modify((query) => {
                if (ids) {
                  query.whereIn('id', ids);
                }
              })
              .stream(),
            this.createBatchingTransform(),
            processingTransform,
          )
    ).then(() => finished(processingTransform));
    streamed.then(
      () =>
        logging.info(
          {
            event: { name: 'members-export.completed' },
            durationMs: Date.now() - start,
            rows: rowsWritten,
            batches: batchesWritten,
          },
          'Members export completed',
        ),
      // The export's span logs a failure.
      () => {},
    );
    attempt.ended(streamed);

    return processingTransform;
  }

  private async openFilteredSnapshot(options: ExportOptions) {
    // Keep the matching set stable across the download. Related reads use the
    // same connection so concurrent exports never wait for a second pool slot.
    const transaction = await this._knex.transaction({ isolationLevel: 'repeatable read' });
    const close = () => transaction.rollback();

    try {
      const read = await this._members.openFilteredBatchReader(options, transaction);
      const firstBatch = await read(MEMBER_COLUMNS, BATCH_SIZE);
      const batches = (async function* () {
        let batch = firstBatch;
        while (batch.length > 0) {
          yield batch;
          if (batch.length < BATCH_SIZE) {
            return;
          }
          batch = await read(MEMBER_COLUMNS, BATCH_SIZE, batch[batch.length - 1].id);
        }
      })();
      return { transaction, batches, close };
    } catch (error) {
      await close();
      throw error;
    }
  }

  // products and labels are small, stable tables, read once up front as id->name
  // maps. Metafield definitions are read once too, which fixes the column set for
  // the whole file: archiving a field mid-export cannot leave the header ragged.
  // For exports outside a snapshot, subsequent batches may have empty cells
  // because each value read applies its own active filter.
  private async fetchReferenceData(): Promise<ReferenceData> {
    const start = Date.now();

    const allProducts = await this._knex('products')
      .select('id', 'name')
      .then((rows) =>
        rows.reduce((acc: Record<string, string>, product: { id: string; name: string }) => {
          acc[product.id] = product.name;
          return acc;
        }, {}),
      );

    const allLabels = await this._knex('labels')
      .select('id', 'name')
      .then((rows) =>
        rows.reduce((acc: Record<string, string>, label: { id: string; name: string }) => {
          acc[label.id] = label.name;
          return acc;
        }, {}),
      );

    logging.info(
      { event: { name: 'members-export.reference_data_read' }, durationMs: Date.now() - start },
      'Read the products and labels an export names',
    );

    const activeMetafields = await this._metafields.activeDefinitions();

    return { allProducts, allLabels, activeMetafields };
  }

  // Group the member stream into batches so the related-data reads are one query per
  // batch rather than one per member.
  private createBatchingTransform(): Transform {
    let currentBatch: MemberDbRow[] = [];

    return new Transform({
      objectMode: true,
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
      },
    });
  }

  // Each flattened row is pushed individually so a batch's rows do not pile up in memory.
  private createProcessingTransform(
    reference: ReferenceData,
    onWritten: (rows: number) => void,
    executor: Knex,
  ): Transform {
    const assembleRelatedData = (memberIds: string[]) =>
      this.assembleRelatedData(memberIds, reference.activeMetafields, executor);
    const flattenBatch = (members: MemberDbRow[], related: BatchRelatedData) =>
      this.flattenBatch(members, related, reference);

    return new Transform({
      objectMode: true,
      writableHighWaterMark: 1,
      async transform(batch: MemberDbRow[], encoding, callback) {
        try {
          const memberIds = batch.map((member) => member.id);
          const related = await assembleRelatedData(memberIds);
          const rows = flattenBatch(batch, related);
          rows.forEach((row) => this.push(row));
          onWritten(rows.length);
          callback();
        } catch (err) {
          callback(
            err instanceof Error ? err : new errors.InternalServerError({ message: String(err) }),
          );
        }
      },
    });
  }

  // One query per related table for the whole batch, not one per member. Metafield
  // values are read only when there are columns to fill.
  private async assembleRelatedData(
    memberIds: string[],
    activeMetafields: CsvField[],
    knex: Knex,
  ): Promise<BatchRelatedData> {
    const [tiers, labels, stripeCustomers, subscriptions, gifts, metafieldValuesMap] =
      await Promise.all([
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

        knex('members_newsletters').distinct('member_id').whereIn('member_id', memberIds),

        knex('gifts')
          .select('id', 'redeemer_member_id')
          .where('status', 'redeemed')
          .whereIn('redeemer_member_id', memberIds),

        activeMetafields.length > 0
          ? this._metafields.valuesForMembers(memberIds, knex)
          : new Map<string, MemberValues>(),
      ]);

    return {
      tiersMap: new Map(
        tiers.map((row: { member_id: string; tiers: string }) => [row.member_id, row.tiers]),
      ),
      labelsMap: new Map(
        labels.map((row: { member_id: string; labels: string }) => [row.member_id, row.labels]),
      ),
      stripeCustomerMap: new Map(
        stripeCustomers.map((row: { member_id: string; stripe_customer_id: string }) => [
          row.member_id,
          row.stripe_customer_id,
        ]),
      ),
      subscribedSet: new Set(subscriptions.map((row: { member_id: string }) => row.member_id)),
      giftIdMap: new Map(
        gifts.map((row: { id: string; redeemer_member_id: string }) => [
          row.redeemer_member_id,
          row.id,
        ]),
      ),
      metafieldValuesMap,
    };
  }

  private flattenBatch(
    members: MemberDbRow[],
    related: BatchRelatedData,
    reference: ReferenceData,
  ): MemberExportRow[] {
    const { tiersMap, labelsMap, stripeCustomerMap, subscribedSet, giftIdMap, metafieldValuesMap } =
      related;
    const { allProducts, allLabels, activeMetafields } = reference;

    return members.map((row) => {
      const tierConcat = tiersMap.get(row.id);
      const tierIds = tierConcat ? tierConcat.split(',') : [];
      const labelConcat = labelsMap.get(row.id);
      const labelIds = labelConcat ? labelConcat.split(',') : [];

      return {
        ...row,
        subscribed: subscribedSet.has(row.id),
        comped: row.status === 'comped',
        gift_id: giftIdMap.get(row.id) || null,
        stripe_customer_id: stripeCustomerMap.get(row.id) || null,
        created_at: moment(row.created_at).toISOString(),
        tiers: tierIds.map((id) => ({ name: allProducts[id] })),
        labels: labelIds.map((id) => ({ name: allLabels[id] })),
        // Flattened here rather than in the serializer because the column set is
        // only knowable from the database. Every member carries a cell for every
        // active field's column, so a member with no values still contributes the
        // full set -- the CSV header is taken from whichever row streams first.
        metafield_cells: csvCellsForFields(activeMetafields, metafieldValuesMap.get(row.id) || {}),
      };
    });
  }
}
