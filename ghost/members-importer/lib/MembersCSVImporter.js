const moment = require('moment-timezone');
const path = require('path');
const fs = require('fs-extra');
const metrics = require('@tryghost/metrics');
const membersCSV = require('@tryghost/members-csv');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const emailTemplate = require('./email-template');
const logging = require('@tryghost/logging');

const messages = {
    filenameCollision: 'Filename already exists, please try again.',
    freeMemberNotAllowedImportTier: 'You cannot import a free member with a specified tier.',
    invalidImportTier: '"{tier}" is not a valid tier.'
};

// The key should correspond to a member model field (unless it's a special purpose field like 'complimentary_plan')
// the value should represent an allowed field name coming from user input
const DEFAULT_CSV_HEADER_MAPPING = {
    email: 'email',
    name: 'name',
    note: 'note',
    subscribed_to_emails: 'subscribed',
    created_at: 'created_at',
    complimentary_plan: 'complimentary_plan',
    stripe_customer_id: 'stripe_customer_id',
    labels: 'labels',
    import_tier: 'import_tier'
};

/**
 * @typedef {Object} MembersCSVImporterOptions
 * @property {string} storagePath - The path to store CSV's in before importing
 * @property {Function} getTimezone - function returning currently configured timezone
 * @property {() => Object} getMembersRepository - member model access instance for data access and manipulation
 * @property {() => Promise<import('@tryghost/tiers/lib/Tier')>} getDefaultTier - async function returning default Member Tier
 * @property {(string) => Promise<import('@tryghost/tiers/lib/Tier')>} getTierByName - async function returning Member Tier by name
 * @property {Function} sendEmail - function sending an email
 * @property {(string) => boolean} isSet - Method checking if specific feature is enabled
 * @property {({job, offloaded, name}) => void} addJob - Method registering an async job
 * @property {Object} knex - An instance of the Ghost Database connection
 * @property {Function} urlFor - function generating urls
 * @property {Object} context
 * @property {Object} stripeUtils - An instance of MembersCSVImporterStripeUtils
 */

module.exports = class MembersCSVImporter {
    /**
     * @param {MembersCSVImporterOptions} options
     */
    constructor({storagePath, getTimezone, getMembersRepository, getDefaultTier, getTierByName, sendEmail, isSet, addJob, knex, urlFor, context, stripeUtils}) {
        this._storagePath = storagePath;
        this._getTimezone = getTimezone;
        this._getMembersRepository = getMembersRepository;
        this._getDefaultTier = getDefaultTier;
        this._getTierByName = getTierByName;
        this._sendEmail = sendEmail;
        this._isSet = isSet;
        this._addJob = addJob;
        this._knex = knex;
        this._urlFor = urlFor;
        this._context = context;
        this._stripeUtils = stripeUtils;
        this._tierIdCache = new Map();
    }

    /**
     * Prepares a CSV file for import
     * - Maps headers based on headerMapping, this allows for a non standard CSV
     *   to be imported, so long as a mapping exists between it and a standard CSV
     * - Stores the CSV to be imported in the storagePath
     * - Creates a MemberImport Job and associated MemberImportBatch's
     *
     * @param {string} inputFilePath - The path to the CSV to prepare
     * @param {Object.<string, string>} [headerMapping] - An object whose keys are headers in the input CSV and values are the header to replace it with
     * @param {Array<string>} [defaultLabels] - A list of labels to apply to every member
     *
     * @returns {Promise<{filePath: string, batches: number, metadata: Object.<string, any>}>} - A promise resolving to the data including filePath of "prepared" CSV
     */
    async prepare(inputFilePath, headerMapping, defaultLabels) {
        headerMapping = headerMapping || DEFAULT_CSV_HEADER_MAPPING;
        // @NOTE: investigate why is it "1" and do we even need this concept anymore?
        const batchSize = 1;

        const siteTimezone = this._getTimezone();
        const currentTime = moment().tz(siteTimezone).format('YYYY-MM-DD HH:mm:ss.SSS');
        const outputFileName = `Members Import ${currentTime}.csv`;
        const outputFilePath = path.join(this._storagePath, '/', outputFileName);

        const pathExists = await fs.pathExists(outputFilePath);

        if (pathExists) {
            throw new errors.DataImportError({message: tpl(messages.filenameCollision)});
        }

        // completely rely on explicit user input for header mappings
        const rows = await membersCSV.parse(inputFilePath, headerMapping, defaultLabels);
        const columns = Object.keys(rows[0]);
        const numberOfBatches = Math.ceil(rows.length / batchSize);
        const mappedCSV = membersCSV.unparse(rows, columns);

        const hasStripeData = !!(rows.find(function rowHasStripeData(row) {
            return !!row.stripe_customer_id;
        }));

        await fs.writeFile(outputFilePath, mappedCSV);

        return {
            filePath: outputFilePath,
            batches: numberOfBatches,
            metadata: {
                hasStripeData
            }
        };
    }

    /**
     * Performs an import of a CSV file
     *
     * @param {string} filePath - the path to a "prepared" CSV file
     */
    async perform(filePath) {
        const performStart = Date.now();
        const rows = await membersCSV.parse(filePath, DEFAULT_CSV_HEADER_MAPPING);

        const defaultTier = await this._getDefaultTier();
        const membersRepository = await this._getMembersRepository();

        // Clear tier ID cache before each import in-case tiers have been updated since last import
        this._tierIdCache.clear();

        // Keep track of any Stripe prices created as a result of an import tier being specified so that they
        // can be archived after the import has completed - This ensures the created Stripe prices cannot be re-used
        // for future subscriptions
        const archivableStripePriceIds = [];

        const result = await rows.reduce(async (resultPromise, row) => {
            const resultAccumulator = await resultPromise;

            // Use doNotReject config to reject `executionPromise` on rollback
            // https://github.com/knex/knex/blob/master/UPGRADING.md
            const trx = await this._knex.transaction(undefined, {doNotRejectOnRollback: false});
            const options = {
                transacting: trx,
                context: this._context
            };

            try {
                // If the member is created in the future, set created_at to now
                // Members created in the future will not appear in admin members list
                // Refs https://github.com/TryGhost/Team/issues/2793
                const createdAt = moment(row.created_at).isAfter(moment()) ? moment().toDate() : row.created_at;
                const memberValues = {
                    email: row.email,
                    name: row.name,
                    note: row.note,
                    subscribed: row.subscribed,
                    created_at: createdAt,
                    labels: row.labels
                };
                const existingMember = await membersRepository.get({email: memberValues.email}, {
                    ...options,
                    withRelated: ['labels', 'newsletters']
                });
                let member;
                if (existingMember) {
                    const existingLabels = existingMember.related('labels') ? existingMember.related('labels').toJSON() : [];
                    const existingNewsletters = existingMember.related('newsletters');

                    // Preserve member's existing newsletter subscription preferences
                    if (existingNewsletters.length > 0 && memberValues.subscribed) {
                        memberValues.newsletters = existingNewsletters.toJSON();
                    }

                    // If member does not have any subscriptions, assume they have previously unsubscribed
                    // and do not re-subscribe them
                    if (!existingNewsletters.length && memberValues.subscribed) {
                        memberValues.subscribed = false;
                    }

                    // Don't overwrite name or note if they are blank in the file
                    if (!row.name) {
                        memberValues.name = existingMember.name;
                    }
                    if (!row.note) {
                        memberValues.note = existingMember.note;
                    }

                    member = await membersRepository.update({
                        ...memberValues,
                        labels: existingLabels.concat(memberValues.labels)
                    }, {
                        ...options,
                        id: existingMember.id
                    });
                } else {
                    member = await membersRepository.create(memberValues, Object.assign({}, options, {
                        context: {
                            import: true
                        }
                    }));
                }

                let importTierId;
                if (row.import_tier) {
                    importTierId = await this.#getTierIdByName(row.import_tier);

                    if (!importTierId) {
                        throw new errors.DataImportError({
                            message: tpl(messages.invalidImportTier, {tier: row.import_tier})
                        });
                    }
                }

                if (row.stripe_customer_id && typeof row.stripe_customer_id === 'string') {
                    let stripeCustomerId;

                    // If 'auto' is passed, try to find the Stripe customer by email
                    if (row.stripe_customer_id.toLowerCase() === 'auto') {
                        stripeCustomerId = await membersRepository.getCustomerIdByEmail(row.email);
                    } else {
                        stripeCustomerId = row.stripe_customer_id;
                    }

                    if (stripeCustomerId) {
                        if (row.import_tier) {
                            const {isNewStripePrice, stripePriceId} = await this._stripeUtils.forceStripeSubscriptionToProduct({
                                customer_id: stripeCustomerId,
                                product_id: importTierId
                            }, options);

                            if (isNewStripePrice) {
                                archivableStripePriceIds.push(stripePriceId);
                            }
                        }

                        await membersRepository.linkStripeCustomer({
                            customer_id: stripeCustomerId,
                            member_id: member.id
                        }, options);
                    }
                } else if (row.complimentary_plan) {
                    const products = [];

                    if (row.import_tier) {
                        products.push({id: importTierId});
                    } else {
                        products.push({id: defaultTier.id.toString()});
                    }

                    await membersRepository.update({products}, {
                        ...options,
                        id: member.id
                    });
                } else if (row.import_tier) {
                    throw new errors.DataImportError({message: tpl(messages.freeMemberNotAllowedImportTier)});
                }

                await trx.commit();
                return {
                    ...resultAccumulator,
                    imported: resultAccumulator.imported + 1
                };
            } catch (error) {
                // The model layer can sometimes throw arrays of errors
                const errorList = [].concat(error);
                const errorMessage = errorList.map(({message}) => message).join(', ');
                await trx.rollback();
                return {
                    ...resultAccumulator,
                    errors: [...resultAccumulator.errors, {
                        ...row,
                        error: errorMessage
                    }]
                };
            }
        }, Promise.resolve({
            imported: 0,
            errors: []
        }));

        await Promise.all(
            archivableStripePriceIds.map(stripePriceId => this._stripeUtils.archivePrice(stripePriceId))
        );

        metrics.metric({
            imported: result.imported,
            errors: result.errors.length,
            value: Date.now() - performStart
        });

        return {
            total: result.imported + result.errors.length,
            ...result
        };
    }

    generateCompletionEmail(result, data) {
        const siteUrl = new URL(this._urlFor('home', null, true));
        const membersUrl = new URL('members', this._urlFor('admin', null, true));
        if (data.importLabel) {
            membersUrl.searchParams.set('label', data.importLabel.slug);
        }
        return emailTemplate({result, siteUrl, membersUrl, ...data});
    }

    generateErrorCSV(result) {
        const errorsWithFormattedMessages = result.errors.map((row) => {
            const formattedError = row.error
                .replace(
                    'Value in [members.email] cannot be blank.',
                    'Missing email address'
                )
                .replace(
                    'Value in [members.note] exceeds maximum length of 2000 characters.',
                    '"Note" exceeds maximum length of 2000 characters'
                )
                .replace(
                    'Value in [members.subscribed] must be one of true, false, 0 or 1.',
                    'Value in "Subscribed to emails" must be "true" or "false"'
                )
                .replace(
                    'Validation (isEmail) failed for email',
                    'Invalid email address'
                )
                .replace(
                    /No such customer:[^,]*/,
                    'Could not find Stripe customer'
                );

            return {
                ...row,
                error: formattedError
            };
        });
        return membersCSV.unparse(errorsWithFormattedMessages);
    }

    /**
     * Send email with attached CSV containing error rows info
     *
     * @param {Object} config
     * @param {String} config.emailRecipient - email recipient for error file
     * @param {String} config.emailSubject - email subject
     * @param {String} config.emailContent - html content of email
     * @param {String} config.errorCSV - error CSV content
     * @param {Object} config.emailSubject - email subject
     * @param {Object} config.importLabel -
     * @param {String} config.importLabel.name - label name
     */
    async sendErrorEmail({emailRecipient, emailSubject, emailContent, errorCSV, importLabel}) {
        await this._sendEmail({
            to: emailRecipient,
            subject: emailSubject,
            html: emailContent,
            forceTextContent: true,
            attachments: [{
                filename: `${importLabel.name} - Errors.csv`,
                content: errorCSV,
                contentType: 'text/csv',
                contentDisposition: 'attachment'
            }]
        });
        return;
    }

    /**
     * Processes CSV file and imports member&label records depending on the size of the imported set
     *
     * @param {Object} config
     * @param {String} config.pathToCSV - path where imported csv with members records is stored
     * @param {Object} config.headerMapping - mapping of CSV headers to member record fields
     * @param {Object} [config.globalLabels] - labels to be applied to whole imported members set
     * @param {Object} config.importLabel -
     * @param {String} config.importLabel.name - label name
     * @param {Object} config.user
     * @param {String} config.user.email - calling user email
     * @param {Object} config.LabelModel - instance of Ghosts Label model
     * @param {Boolean} config.forceInline - allows to force performing imports not in a job (used in test environment)
     * @param {{testImportThreshold: () => Promise<void>}} config.verificationTrigger
     */
    async process({pathToCSV, headerMapping, globalLabels, importLabel, user, LabelModel, forceInline, verificationTrigger}) {
        const meta = {};
        const job = await this.prepare(pathToCSV, headerMapping, globalLabels);

        meta.originalImportSize = job.batches;

        if ((job.batches <= 500 && !job.metadata.hasStripeData) || forceInline) {
            const result = await this.perform(job.filePath);
            const importLabelModel = result.imported ? await LabelModel.findOne(importLabel) : null;
            await verificationTrigger.testImportThreshold();

            return {
                meta: Object.assign(meta, {
                    stats: {
                        imported: result.imported,
                        invalid: result.errors
                    },
                    import_label: importLabelModel
                })
            };
        } else {
            const emailRecipient = user.email;
            this._addJob({
                job: async () => {
                    try {
                        const result = await this.perform(job.filePath);
                        const importLabelModel = result.imported ? await LabelModel.findOne(importLabel) : null;
                        const emailContent = this.generateCompletionEmail(result, {
                            emailRecipient,
                            importLabel: importLabelModel ? importLabelModel.toJSON() : null
                        });
                        const errorCSV = this.generateErrorCSV(result);
                        const emailSubject = result.imported > 0 ? 'Your member import is complete' : 'Your member import was unsuccessful';
                        await this.sendErrorEmail({
                            emailRecipient,
                            emailSubject,
                            emailContent,
                            errorCSV,
                            importLabel
                        });
                    } catch (e) {
                        logging.error('Error in members import job');
                        logging.error(e);
                    }

                    // Still check verification triggers in case of errors (e.g., email sending failed)
                    try {
                        await verificationTrigger.testImportThreshold();
                    } catch (e) {
                        logging.error('Error in members import job when testing import threshold');
                        logging.error(e);
                    }
                },
                offloaded: false,
                name: 'members-import'
            });

            return {
                meta
            };
        }
    }

    /**
     * Retrieve the ID of a tier, querying by its name, and cache the result
     *
     * @param {string} name
     * @returns {Promise<string|null>}
     */
    async #getTierIdByName(name) {
        if (!this._tierIdCache.has(name)) {
            const tier = await this._getTierByName(name);

            if (!tier) {
                return null;
            }

            this._tierIdCache.set(name, tier.id.toString());
        }

        return this._tierIdCache.get(name);
    }
};
