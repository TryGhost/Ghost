const moment = require('moment-timezone');
const path = require('path');
const fs = require('fs-extra');
const membersCSV = require('@tryghost/members-csv');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const emailTemplate = require('./email-template');
const logging = require('@tryghost/logging');

const messages = {
    filenameCollision: 'Filename already exists, please try again.'
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
    labels: 'labels'
};

module.exports = class MembersCSVImporter {
    /**
     * @param {Object} options
     * @param {string} options.storagePath - The path to store CSV's in before importing
     * @param {Function} options.getTimezone - function returning currently configured timezone
     * @param {() => Object} options.getMembersRepository - member model access instance for data access and manipulation
     * @param {() => Promise<import('@tryghost/tiers/lib/Tier')>} options.getDefaultTier - async function returning default Member Tier
     * @param {Function} options.sendEmail - function sending an email
     * @param {(string) => boolean} options.isSet - Method checking if specific feature is enabled
     * @param {({job, offloaded, name}) => void} options.addJob - Method registering an async job
     * @param {Object} options.knex - An instance of the Ghost Database connection
     * @param {Function} options.urlFor - function generating urls
     * @param {Object} options.context
     */
    constructor({storagePath, getTimezone, getMembersRepository, getDefaultTier, sendEmail, isSet, addJob, knex, urlFor, context}) {
        this._storagePath = storagePath;
        this._getTimezone = getTimezone;
        this._getMembersRepository = getMembersRepository;
        this._getDefaultTier = getDefaultTier;
        this._sendEmail = sendEmail;
        this._isSet = isSet;
        this._addJob = addJob;
        this._knex = knex;
        this._urlFor = urlFor;
        this._context = context;
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
        const rows = await membersCSV.parse(filePath, DEFAULT_CSV_HEADER_MAPPING);

        const defaultTier = await this._getDefaultTier();
        const membersRepository = await this._getMembersRepository();

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
                    withRelated: ['labels']
                });
                let member;
                if (existingMember) {
                    const existingLabels = existingMember.related('labels') ? existingMember.related('labels').toJSON() : [];
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

                if (row.stripe_customer_id && typeof row.stripe_customer_id === 'string') {
                    await membersRepository.linkStripeCustomer({
                        customer_id: row.stripe_customer_id,
                        member_id: member.id
                    }, options);
                } else if (row.complimentary_plan) {
                    await membersRepository.update({
                        products: [{id: defaultTier.id.toString()}]
                    }, {
                        ...options,
                        id: member.id
                    });
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
};
