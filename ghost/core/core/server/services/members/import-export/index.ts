import type {Knex} from 'knex';
import MembersCSVImporter, {type MembersRepository, type GiftService, type EmailNotifications, type Tier} from './import/importer';
import readMemberRows from './import/reader';
import {createRowSpool} from './import/spool';
import MembersCSVExporter, {type ExportOptions, type CustomFieldDefinition} from './export/exporter';

const MembersCSVImporterStripeUtils = require('./import/stripe-utils');
const db = require('../../../data/db');
const models = require('../../../models');
const labs = require('../../../../shared/labs');

// The raw collaborators the members service hands the import composition root, before
// they are adapted into the ports the importer declares. The members repository is the
// importer's aggregate minus the import-label lookup, which the root folds in itself.
interface ImporterServices {
    knex: Knex;
    getMembersRepository(): Promise<Omit<MembersRepository, 'getImportLabel'>>;
    getDefaultTier(): Promise<Tier>;
    getTierByName(name: string): Promise<Tier | null>;
    getGiftService(): GiftService;
    sendEmail: EmailNotifications['send'];
    urlFor: EmailNotifications['urlFor'];
    addJob(job: {job: () => Promise<void>; offloaded: boolean; name: string}): void;
    getTimezone(): string;
    getInlineThreshold(): number;
    stripeAPIService: unknown;
    productRepository: unknown;
}

// The custom fields services the members service hands the export composition root.
interface CustomFieldsServices {
    definitions: {browse(): Promise<CustomFieldDefinition[]>};
    values: {getValuesForMembers(memberIds: string[]): Promise<Map<string, Record<string, unknown>>>};
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
        getCustomerIdByEmail: async email => (await getMembersRepository()).getCustomerIdByEmail(email),
        linkStripeCustomer: async (link, options) => (await getMembersRepository()).linkStripeCustomer(link, options),
        getImportLabel: name => models.Label.findOne({name})
    };

    // The completion email: its recipient, links and delivery in one collaborator.
    const email: EmailNotifications = {
        send: deps.sendEmail,
        getDefaultRecipient: async () => (await models.User.getOwnerUser()).get('email'),
        urlFor: deps.urlFor
    };

    // Gifts is initialised at boot and always present at request time; the getter
    // resolves it lazily so the ready service is picked up whenever a row uses it.
    const gifts: GiftService = {
        reassignRedeemer: (giftId, memberId, options) => deps.getGiftService().reassignRedeemer(giftId, memberId, options)
    };

    return new MembersCSVImporter({
        knex: deps.knex,
        readRows: readMemberRows,
        spool: createRowSpool(),
        members,
        tiers: {
            getDefault: deps.getDefaultTier,
            getByName: deps.getTierByName
        },
        stripe: new MembersCSVImporterStripeUtils({
            stripeAPIService: deps.stripeAPIService,
            productRepository: deps.productRepository
        }),
        gifts,
        email,
        addJob: deps.addJob,
        getTimezone: deps.getTimezone,
        getInlineThreshold: deps.getInlineThreshold
    });
}

// Build the members CSV exporter. The same composition root from the other direction:
// knex and the members id lookup are wired here, and the custom fields definitions and
// values services are injected (boot builds them before this one). The labs flag alone
// decides whether custom field columns appear, so nothing flag-shaped leaks into the
// exporter itself.
export function makeExporter({definitions, values}: CustomFieldsServices): (options?: ExportOptions) => Promise<NodeJS.ReadableStream> {
    const exporter = new MembersCSVExporter({
        knex: db.knex,

        members: {
            // Minimal query, only to fetch the ids of the filtered members; the stream
            // reads their related data itself.
            findFilteredIds: async (options) => {
                const page = await models.Member.findPage({...options, withRelated: [], columns: ['id'], limit: 'all'});
                return page.data.map((member: {id: string}) => member.id);
            }
        },

        customFields: {
            // Boot builds the definitions and values services before this one, so they
            // are always present -- no not-initialised state to guard. The flag decides
            // whether their columns are included at all.
            activeDefinitions: async (): Promise<CustomFieldDefinition[]> => (labs.isSet('membersCustomFields') ? definitions.browse() : []),
            valuesForMembers: memberIds => values.getValuesForMembers(memberIds)
        }
    });

    return (options = {}) => exporter.export(options);
}
