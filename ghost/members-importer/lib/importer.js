const moment = require('moment-timezone');
const path = require('path');
const fs = require('fs-extra');
const membersCSV = require('@tryghost/members-csv');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const emailTemplate = require('./email-template');

const messages = {
    filenameCollision: 'Filename already exists, please try again.',
    jobAlreadyComplete: 'Job is already complete.'
};

module.exports = class MembersCSVImporter {
    /**
     * @param {Object} options
     * @param {string} options.storagePath - The path to store CSV's in before importing
     * @param {Function} options.getTimezone - function returning currently configured timezone
     * @param {() => Object} options.getMembersApi
     * @param {Function} options.sendEmail - function sending an email
     * @param {(string) => boolean} options.isSet - Method checking if specific feature is enabled
     * @param {({name, at, job, data, offloaded}) => void} options.addJob - Method registering an async job
     * @param {Object} options.knex - An instance of the Ghost Database connection
     * @param {Function} options.urlFor - function generating urls
     * @param {() => Promise<number>} options.fetchThreshold - fetches the threshold to activate freeze flag if reached
     */
    constructor({storagePath, getTimezone, getMembersApi, sendEmail, isSet, addJob, knex, urlFor, fetchThreshold}) {
        this._storagePath = storagePath;
        this._getTimezone = getTimezone;
        this._getMembersApi = getMembersApi;
        this._sendEmail = sendEmail;
        this._isSet = isSet;
        this._addJob = addJob;
        this._knex = knex;
        this._urlFor = urlFor;
        this._fetchThreshold = fetchThreshold;
    }

    /**
     * @typedef {string} JobID
     */

    /**
     * @typedef {Object} Job
     * @prop {string} filename
     * @prop {JobID} id
     * @prop {string} status
     */

    /**
     * Get the Job for a jobCode
     * @param {JobID} jobId
     * @returns {Promise<Job>}
     */
    async getJob(jobId) {
        return {
            id: jobId,
            filename: jobId,
            status: 'pending'
        };
    }

    /**
     * Prepares a CSV file for import
     * - Maps headers based on headerMapping, this allows for a non standard CSV
     *   to be imported, so long as a mapping exists between it and a standard CSV
     * - Stores the CSV to be imported in the storagePath
     * - Creates a MemberImport Job and associated MemberImportBatch's
     *
     * @param {string} inputFilePath - The path to the CSV to prepare
     * @param {Object.<string, string>} headerMapping - An object whos keys are headers in the input CSV and values are the header to replace it with
     * @param {Array<string>} defaultLabels - A list of labels to apply to every member
     *
     * @returns {Promise<{id: JobID, batches: number, metadata: Object.<string, any>}>} - A promise resolving to the id of the MemberImport Job
     */
    async prepare(inputFilePath, headerMapping, defaultLabels) {
        const batchSize = 1;

        const siteTimezone = this._getTimezone();
        const currentTime = moment().tz(siteTimezone).format('YYYY-MM-DD HH:mm:ss.SSS');
        const outputFileName = `Members Import ${currentTime}.csv`;
        const outputFilePath = path.join(this._storagePath, '/', outputFileName);

        const pathExists = await fs.pathExists(outputFilePath);

        if (pathExists) {
            throw new errors.DataImportError(tpl(messages.filenameCollision));
        }

        const rows = await membersCSV.parse(inputFilePath, headerMapping, defaultLabels);
        const numberOfBatches = Math.ceil(rows.length / batchSize);
        const mappedCSV = membersCSV.unparse(rows);

        const hasStripeData = rows.find(function rowHasStripeData(row) {
            return !!row.stripe_customer_id || !!row.complimentary_plan;
        });

        await fs.writeFile(outputFilePath, mappedCSV);

        return {
            id: outputFilePath,
            batches: numberOfBatches,
            metadata: {
                hasStripeData
            }
        };
    }

    /**
     * Performs an import of a CSV file
     *
     * @param {JobID} id - The id of the job to perform
     */
    async perform(id) {
        const job = await this.getJob(id);

        if (job.status === 'complete') {
            throw new errors.BadRequestError(tpl(messages.jobAlreadyComplete));
        }

        const rows = membersCSV.parse(job.filename);

        const membersApi = await this._getMembersApi();

        const defaultProductPage = await membersApi.productRepository.list({
            limit: 1
        });

        const defaultProduct = defaultProductPage.data[0];

        const result = await rows.reduce(async (resultPromise, row) => {
            const resultAccumulator = await resultPromise;

            const trx = await this._knex.transaction();
            const options = {
                transacting: trx
            };

            try {
                const existingMember = await membersApi.members.get({email: row.email}, {
                    ...options,
                    withRelated: ['labels']
                });
                let member;
                if (existingMember) {
                    const existingLabels = existingMember.related('labels') ? existingMember.related('labels').toJSON() : [];
                    member = await membersApi.members.update({
                        ...row,
                        labels: existingLabels.concat(row.labels)
                    }, {
                        ...options,
                        id: existingMember.id
                    });
                } else {
                    member = await membersApi.members.create(row, options);
                }

                if (row.stripe_customer_id) {
                    await membersApi.members.linkStripeCustomer({
                        customer_id: row.stripe_customer_id,
                        member_id: member.id
                    }, options);
                } else if (row.complimentary_plan) {
                    if (!this._isSet('multipleProducts')) {
                        await membersApi.members.setComplimentarySubscription(member, options);
                    } else if (!row.products) {
                        await membersApi.members.update({
                            products: [{id: defaultProduct.id}]
                        }, {
                            ...options,
                            id: member.id
                        });
                    }
                }

                if (this._isSet('multipleProducts')) {
                    if (row.products) {
                        await membersApi.members.update({
                            products: row.products
                        }, {
                            ...options,
                            id: member.id
                        });
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
     */
    async process({pathToCSV, headerMapping, globalLabels, importLabel, user, LabelModel}) {
        const meta = {};
        const job = await this.prepare(pathToCSV, headerMapping, globalLabels);
        const threshold = await this._fetchThreshold();

        meta.originalImportSize = job.batches;
        meta.freeze = job.batches > threshold;

        if (job.batches <= 500 && !job.metadata.hasStripeData) {
            const result = await this.perform(job.id);
            const importLabelModel = result.imported ? await LabelModel.findOne(importLabel) : null;

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
                    const result = await this.perform(job.id);
                    const importLabelModel = result.imported ? await LabelModel.findOne(importLabel) : null;
                    const emailContent = this.generateCompletionEmail(result, {
                        emailRecipient,
                        importLabel: importLabelModel ? importLabelModel.toJSON() : null
                    });
                    const errorCSV = this.generateErrorCSV(result);
                    const emailSubject = result.imported > 0 ? 'Your member import is complete' : 'Your member import was unsuccessful';

                    await this._sendEmail({
                        to: emailRecipient,
                        subject: emailSubject,
                        html: emailContent,
                        forceTextContent: true,
                        attachments: [{
                            filename: `${importLabel.name} - Errors.csv`,
                            contents: errorCSV,
                            contentType: 'text/csv',
                            contentDisposition: 'attachment'
                        }]
                    });
                },
                offloaded: false
            });

            return {
                meta
            };
        }
    }
};
