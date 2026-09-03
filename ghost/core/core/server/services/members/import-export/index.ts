import type { Knex } from 'knex';
import type { CsvField } from '@tryghost/metafield-types/csv';
import type { WrittenBy } from '../../members-metafields';
import MembersCSVImporter, {
  type MembersRepository,
  type GiftService,
  type EmailNotifications,
  type Tier,
  type MetafieldsImport,
  type FailureReporter,
} from './import/importer';
import readMemberRows from './import/reader';
import { createRowSpool } from './import/spool';
import MembersCSVExporter, {
  type ExportOptions,
  type MetafieldDefinition,
} from './export/exporter';

const MembersCSVImporterStripeUtils = require('./import/stripe-utils');
const db = require('../../../data/db');
const models = require('../../../models');
const logging = require('@tryghost/logging');
const sentry = require('../../../../shared/sentry');

// The raw collaborators the members service hands the import composition root, before
// they are adapted into the ports the importer declares. The members repository is the
// importer's aggregate minus the import-label lookup, which the root folds in itself.
interface ImporterServices {
  knex: Knex;
  getMembersRepository(): Promise<Omit<MembersRepository, 'getImportLabel'>>;
  getDefaultTier(): Promise<Tier>;
  getTierByName(name: string): Promise<Tier | null>;
  getGiftService(): {
    reassignRedeemer(input: {
      giftId: string;
      memberId: string;
      transacting?: Knex.Transaction;
    }): Promise<void>;
  };
  sendEmail: EmailNotifications['send'];
  urlFor(type: string, data: unknown, absolute: boolean): string;
  addJob(job: { job: () => Promise<void>; offloaded: boolean; name: string }): void;
  getTimezone(): string;
  getInlineThreshold(): number;
  stripeAPIService: unknown;
  productRepository: unknown;
  // The metafields services the members service hands the import composition root.
  metafields: {
    definitions: { browse(): Promise<CsvField[]> };
    values: {
      planWrite(values: Record<string, unknown>): Promise<unknown[]>;
      applyWrite(
        memberId: string,
        plan: unknown[],
        options: { writtenBy: WrittenBy; executor?: Knex },
      ): Promise<void>;
    };
  };
}

// The metafields services the members service hands the export composition root.
interface MetafieldsServices {
  definitions: { browse(): Promise<MetafieldDefinition[]> };
  values: {
    getValuesForMembers(memberIds: string[]): Promise<Map<string, Record<string, unknown>>>;
  };
}

// Build the members CSV importer. This is the composition root: today's models and
// services are wired behind the collaborators the importer declares, one per
// concern, so nothing Bookshelf-shaped leaks into the import service itself.
export function makeImporter(deps: ImporterServices) {
  // The members repository resolves asynchronously and is stable once ready, so
  // cache the promise and reuse it across every call the import makes.
  let membersRepositoryPromise: Promise<Omit<MembersRepository, 'getImportLabel'>> | undefined;
  const getMembersRepository = () => (membersRepositoryPromise ??= deps.getMembersRepository());

  // The members aggregate, plus the import label lookup folded in so the label
  // (member-tagging data) does not need a source of its own.
  const members: MembersRepository = {
    get: async (query, options) => (await getMembersRepository()).get(query, options),
    create: async (values, options) => (await getMembersRepository()).create(values, options),
    update: async (values, options) => (await getMembersRepository()).update(values, options),
    getCustomerIdByEmail: async (email) =>
      (await getMembersRepository()).getCustomerIdByEmail(email),
    linkStripeCustomer: async (link, options) =>
      (await getMembersRepository()).linkStripeCustomer(link, options),
    getImportLabel: (name) => models.Label.findOne({ name }),
  };

  // The completion email: its recipient, links and delivery in one collaborator.
  const email: EmailNotifications = {
    send: deps.sendEmail,
    getDefaultRecipient: async () => (await models.User.getOwnerUser()).get('email'),
    links: {
      siteUrl: () => new URL(deps.urlFor('home', null, true)),
      membersUrl: (labelSlug?: string) => {
        const url = new URL('members', deps.urlFor('admin', null, true));
        if (labelSlug) {
          url.searchParams.set('label', labelSlug);
        }
        return url;
      },
    },
  };

  // Gifts is initialised at boot and always present at request time; the getter
  // resolves it lazily so the ready service is picked up whenever a row uses it.
  const gifts: GiftService = {
    reassignRedeemer: (giftId, memberId, options) =>
      deps.getGiftService().reassignRedeemer({
        giftId,
        memberId,
        transacting: options.transacting,
      }),
  };

  const metafields: MetafieldsImport = {
    activeFields: async () => deps.metafields.definitions.browse(),
    planWrite: (values) => deps.metafields.values.planWrite(values),
    // Every value the import writes came out of the file, whichever column carried it.
    // An import has no id to give until runs are tracked, so it names its kind only.
    applyWrite: (memberId, plan, executor) =>
      deps.metafields.values.applyWrite(memberId, plan, {
        writtenBy: { type: 'import', id: null },
        executor,
      }),
  };

  // Inline jobs never reach the job manager's Sentry handler, which is wired to the
  // offloaded worker path only, so a throw here would be seen by nobody.
  const report: FailureReporter = (error) => {
    try {
      logging.error(
        { event: { name: 'members.import.error' }, err: error },
        '[Background Job] members-import error',
      );
      sentry.captureException(error);
    } catch {
      // Callers report from catch and finally blocks, so this must not throw.
    }
  };

  return new MembersCSVImporter({
    knex: deps.knex,
    readRows: readMemberRows,
    spool: createRowSpool(),
    members,
    tiers: {
      getDefault: deps.getDefaultTier,
      getByName: deps.getTierByName,
    },
    stripe: new MembersCSVImporterStripeUtils({
      stripeAPIService: deps.stripeAPIService,
      productRepository: deps.productRepository,
    }),
    gifts,
    metafields,
    email,
    report,
    addJob: deps.addJob,
    getTimezone: deps.getTimezone,
    getInlineThreshold: deps.getInlineThreshold,
  });
}

// Build the members CSV exporter. The same composition root from the other direction:
// knex and the members id lookup are wired here, and the metafields definitions and
// values services are injected (boot builds them before this one).
export function makeExporter({
  definitions,
  values,
}: MetafieldsServices): (options?: ExportOptions) => Promise<NodeJS.ReadableStream> {
  const exporter = new MembersCSVExporter({
    knex: db.knex,

    members: {
      // Minimal query, only to fetch the ids of the filtered members; the stream
      // reads their related data itself.
      findFilteredIds: async (options) => {
        const page = await models.Member.findPage({
          ...options,
          withRelated: [],
          columns: ['id'],
          limit: 'all',
        });
        return page.data.map((member: { id: string }) => member.id);
      },
    },

    metafields: {
      // Boot builds the definitions and values services before this one, so they
      // are always present -- no not-initialised state to guard.
      activeDefinitions: async (): Promise<MetafieldDefinition[]> => definitions.browse(),
      valuesForMembers: (memberIds) => values.getValuesForMembers(memberIds),
    },
  });

  return (options = {}) => exporter.export(options);
}
