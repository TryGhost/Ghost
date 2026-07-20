const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const crypto = require('crypto');
const moment = require('moment-timezone');
const metrics = require('@tryghost/metrics');
const membersCSV = require('@tryghost/members-csv');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const emailTemplate = require('./email-template');
const logging = require('@tryghost/logging');

const messages = {
    freeMemberNotAllowedImportTier: 'You cannot import a free member with a specified tier.',
    invalidImportTier: '"{tier}" is not a valid tier.',
    giftServiceUnavailable: 'Gift service is not available.',
    giftCannotCombineWithImportTier: 'Cannot specify both gift_id and import_tier.',
    giftCannotCombineWithComplimentary: 'Cannot specify both gift_id and complimentary_plan.',
    giftReassignFailed: 'Failed to reassign gift to member.'
};

function wrapGiftError(error) {
    const message = (error && typeof error.message === 'string' && error.message) || tpl(messages.giftReassignFailed);
    return new errors.DataImportError({
        message: `Member cannot be assigned to a gift: ${message}`
    });
}

// Keys are the column names a publisher sees and maps onto; values are the field
// names the import itself reads. They differ for `subscribed_to_emails`, which the
// member model calls `subscribed`.
const DEFAULT_CSV_HEADER_MAPPING = {
    email: 'email',
    name: 'name',
    note: 'note',
    subscribed_to_emails: 'subscribed',
    created_at: 'created_at',
    complimentary_plan: 'complimentary_plan',
    stripe_customer_id: 'stripe_customer_id',
    labels: 'labels',
    import_tier: 'import_tier',
    gift_id: 'gift_id'
};

/**
 * @typedef {Object} MembersCSVImporterOptions
 * @property {() => Object} getMembersRepository - member model access instance for data access and manipulation
 * @property {() => Promise<import('../../tiers/tier')>} getDefaultTier - async function returning default Member Tier
 * @property {(string) => Promise<import('../../tiers/tier')>} getTierByName - async function returning Member Tier by name
 * @property {() => Promise<import('../../gifts/gift-service').GiftService>} getGiftService - async function returning the GiftService instance
 * @property {Function} sendEmail - function sending an email
 * @property {(string) => boolean} isSet - Method checking if specific feature is enabled
 * @property {({job, data, offloaded, name}) => void} addJob - Method registering an async job
 * @property {Object} knex - An instance of the Ghost Database connection
 * @property {Function} urlFor - function generating urls
 * @property {Object} context
 * @property {Object} stripeUtils - An instance of MembersCSVImporterStripeUtils
 */

/**
 * Resolves a caller's header mapping onto the member model's own field names.
 *
 * Has to happen before parsing rather than after: the parser picks a value's type
 * from the name it lands on, so a blank `subscribed` reads as subscribed while a
 * blank anything-else reads as null.
 *
 * A field the model doesn't know is carried through untouched, which is what lets
 * columns outside this fixed set reach the import.
 *
 * Two columns can name one field: "subscribed_to_emails" and "subscribed" are the
 * same one. First claim wins. Left alone the parser takes whichever column came
 * last, so an ambiguous mapping would flip a member's subscription on column order.
 *
 * @param {Object.<string, string>} headerMapping
 * @returns {Object.<string, string>}
 */
function composeHeaderMapping(headerMapping) {
    const modelFieldMapping = {};
    const claimedFields = new Set();

    for (const [csvHeader, field] of Object.entries(headerMapping)) {
        // Own-property check, so a field named after something on Object.prototype
        // resolves to itself rather than to the prototype.
        const modelField = Object.hasOwn(DEFAULT_CSV_HEADER_MAPPING, field) ? DEFAULT_CSV_HEADER_MAPPING[field] : field;

        if (claimedFields.has(modelField)) {
            continue;
        }

        claimedFields.add(modelField);
        modelFieldMapping[csvHeader] = modelField;
    }

    return modelFieldMapping;
}

/**
 * Turns one parsed CSV row into the row an import applies.
 *
 * `__parsed_extra` holds a ragged row's overflow fields: a parser artifact rather
 * than a column anyone mapped, so it does not travel with the row.
 *
 * Labels are copied because the member model stamps ids and trims names onto them
 * in place, while each row runs in its own transaction that can roll back. Rows
 * sharing label objects would carry one row's mutations into the next.
 *
 * @param {Object} parsedRow
 * @returns {Object}
 */
// eslint-disable-next-line no-unused-vars, camelcase
function toImportRow({__parsed_extra, ...row}) {
    return {
        ...row,
        labels: row.labels.map(label => (typeof label === 'string' ? {name: label} : {...label}))
    };
}

module.exports = class MembersCSVImporter {
    /**
     * @param {MembersCSVImporterOptions} options
     */
    constructor({getMembersRepository, getDefaultTier, getTierByName, getGiftService, sendEmail, isSet, addJob, knex, urlFor, context, stripeUtils}) {
        this._getMembersRepository = getMembersRepository;
        this._getDefaultTier = getDefaultTier;
        this._getTierByName = getTierByName;
        this._getGiftService = getGiftService;
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
     * Reads a CSV file into the rows an import will apply
     * - Maps headers based on headerMapping, this allows for a non standard CSV
     *   to be imported, so long as a mapping exists between it and a standard CSV
     *
     * @param {string} inputFilePath - The path to the CSV to prepare
     * @param {Object.<string, string>} [headerMapping] - An object whose keys are headers in the input CSV and values are the header to replace it with
     * @param {Array<string|{name: string}>} [defaultLabels] - A list of labels to apply to every member
     *
     * @returns {Promise<{rows: Array<Object>, metadata: Object.<string, any>}>} - A promise resolving to the parsed rows and what the caller needs to know about them
     */
    async prepare(inputFilePath, headerMapping, defaultLabels) {
        const parsed = await membersCSV.parse(
            inputFilePath,
            composeHeaderMapping(headerMapping || DEFAULT_CSV_HEADER_MAPPING),
            defaultLabels
        );

        const rows = parsed.map(toImportRow);

        const hasStripeData = !!(rows.find(function rowHasStripeData(row) {
            return !!row.stripe_customer_id;
        }));

        return {
            rows,
            metadata: {
                hasStripeData
            }
        };
    }

    /**
     * Writes rows where a queued job can read them back.
     *
     * Only the queued path needs this: an inline import finishes inside the request
     * that started it, but a queued one outlives the request, and the uploaded CSV it
     * came from is deleted the moment the response finishes.
     *
     * The temp directory is enough: the spool does not need to outlive the queue,
     * which is in-process. A crash between spooling and running orphans the file,
     * bounded by whatever reaps the temp directory.
     *
     * @param {Array<Object>} rows
     * @returns {Promise<string>} path to the spooled rows
     */
    async spoolRows(rows) {
        const spoolPath = path.join(os.tmpdir(), `members-import-${crypto.randomUUID()}.json`);

        // Member PII, in a directory shared with every other process on the host
        await fs.writeFile(spoolPath, JSON.stringify(rows), {mode: 0o600});

        return spoolPath;
    }

    /**
     * @param {string} spoolPath - a path returned by spoolRows()
     * @returns {Promise<Array<Object>>}
     */
    async readSpooledRows(spoolPath) {
        return JSON.parse(await fs.readFile(spoolPath, 'utf8'));
    }

    /**
     * Performs an import of already-parsed CSV rows
     *
     * @param {Array<Object>} rows - the rows returned by prepare()
     */
    async perform(rows) {
        const performStart = Date.now();

        const defaultTier = await this._getDefaultTier();
        const membersRepository = await this._getMembersRepository();
        const giftService = this._getGiftService ? await this._getGiftService() : null;

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
                // Early validation of mutually exclusive columns so we fail the row before
                // any member/tier work.
                if (row.gift_id) {
                    if (row.import_tier) {
                        throw wrapGiftError(new errors.DataImportError({message: tpl(messages.giftCannotCombineWithImportTier)}));
                    }
                    if (row.complimentary_plan) {
                        throw wrapGiftError(new errors.DataImportError({message: tpl(messages.giftCannotCombineWithComplimentary)}));
                    }
                }

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

                if (row.gift_id) {
                    if (!giftService) {
                        throw wrapGiftError(new errors.DataImportError({message: tpl(messages.giftServiceUnavailable)}));
                    }

                    try {
                        await giftService.reassignRedeemer(row.gift_id, member.id, {transacting: trx});
                    } catch (giftError) {
                        throw wrapGiftError(giftError);
                    }
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
     * @param {string} config.emailRecipient - email recipient for error file
     * @param {string} config.emailSubject - email subject
     * @param {string} config.emailContent - html content of email
     * @param {string} config.errorCSV - error CSV content
     * @param {Object} config.emailSubject - email subject
     * @param {Object} config.importLabel -
     * @param {string} config.importLabel.name - label name
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
     * @param {string} config.pathToCSV - path where imported csv with members records is stored
     * @param {Object} config.headerMapping - mapping of CSV headers to member record fields
     * @param {Object} [config.globalLabels] - labels to be applied to whole imported members set
     * @param {Object} config.importLabel -
     * @param {string} config.importLabel.name - label name
     * @param {Object} config.user
     * @param {string} config.user.email - calling user email
     * @param {Object} config.LabelModel - instance of Ghosts Label model
     * @param {boolean} config.forceInline - allows to force performing imports not in a job (used in test environment)
     * @param {{testImportThreshold: () => Promise<void>}} config.verificationTrigger
     */
    async process({pathToCSV, headerMapping, globalLabels, importLabel, user, LabelModel, forceInline, verificationTrigger}) {
        const meta = {};
        const job = await this.prepare(pathToCSV, headerMapping, globalLabels);

        meta.originalImportSize = job.rows.length;

        if ((job.rows.length <= 500 && !job.metadata.hasStripeData) || forceInline) {
            const result = await this.perform(job.rows);
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
            const spoolPath = await this.spoolRows(job.rows);
            const data = {spoolPath, emailRecipient: user.email, importLabel};

            try {
                this._addJob({
                    // Plain data and live collaborators kept apart, so a queue that
                    // stores its jobs has a payload it can store. Nothing crosses a
                    // process boundary yet.
                    job: jobData => this.runImportJob(jobData, {LabelModel, verificationTrigger}),
                    data,
                    offloaded: false,
                    name: 'members-import'
                });
            } catch (err) {
                // The in-process queue only schedules, so this guards an enqueue that
                // can fail: nothing owns the spool until a job exists to own it.
                await fs.remove(spoolPath).catch(() => {});
                throw err;
            }

            logging.info({
                event: {name: 'members.import.queued'},
                rowCount: job.rows.length,
                importLabel: importLabel && importLabel.name
            }, 'Queued a members import');

            return {
                meta
            };
        }
    }

    /**
     * Runs a queued import and emails the result to whoever started it.
     *
     * @param {{spoolPath: string, emailRecipient: string, importLabel: Object}} data - plain data, everything a persisted queue would need to store
     * @param {{LabelModel: Object, verificationTrigger: Object}} deps - live collaborators, resolved by the caller
     */
    async runImportJob({spoolPath, emailRecipient, importLabel}, {LabelModel, verificationTrigger}) {
        try {
            const rows = await this.readSpooledRows(spoolPath);
            const result = await this.perform(rows);
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

            logging.info({
                event: {name: 'members.import.completed'},
                imported: result.imported,
                errors: result.errors.length,
                importLabel: importLabel && importLabel.name
            }, 'Completed a members import');
        } catch (err) {
            logging.error({
                event: {name: 'members.import.failed'},
                emailRecipient,
                importLabel: importLabel && importLabel.name,
                err
            }, 'Members import job failed');
        } finally {
            // Including on failure: the publisher still has the file they uploaded,
            // so keeping their member data here buys nothing.
            await fs.remove(spoolPath).catch((err) => {
                logging.error({event: {name: 'members.import.spool_cleanup_failed'}, spoolPath, err}, 'Failed to remove a members import spool');
            });
        }

        // Still check verification triggers in case of errors (e.g., email sending failed)
        try {
            await verificationTrigger.testImportThreshold();
        } catch (e) {
            logging.error('Error in members import job when testing import threshold');
            logging.error(e);
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
