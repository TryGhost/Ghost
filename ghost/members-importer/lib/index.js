// @ts-check
const moment = require('moment-timezone');
const path = require('path');
const fs = require('fs-extra');
const membersCSV = require('@tryghost/members-csv');
const GhostMailer = require('../../mail').GhostMailer;
const urlUtils = require('../../../../shared/url-utils');
const db = require('../../../data/db');
const emailTemplate = require('./email-template');
const jobsService = require('../../jobs');

const ghostMailer = new GhostMailer();
module.exports = class MembersCSVImporter {
    /**
     * @param {Object} config
     * @param {string} config.storagePath - The path to store CSV's in before importing
     * @param {Object} settingsCache - An instance of the Ghost Settings Cache
     * @param {() => Object} getMembersApi
     */
    constructor(config, settingsCache, getMembersApi) {
        this._storagePath = config.storagePath;
        this._settingsCache = settingsCache;
        this._getMembersApi = getMembersApi;
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

        const siteTimezone = this._settingsCache.get('timezone');
        const currentTime = moment().tz(siteTimezone).format('YYYY-MM-DD HH:mm:ss.SSS');
        const outputFileName = `Members Import ${currentTime}.csv`;
        const outputFilePath = path.join(this._storagePath, '/', outputFileName);

        const pathExists = await fs.pathExists(outputFilePath);

        if (pathExists) {
            throw new Error('Maybe we need better name generation');
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
            throw new Error('Job is already complete');
        }

        const rows = membersCSV.parse(job.filename);

        const membersApi = await this._getMembersApi();

        const result = await rows.reduce(async (resultPromise, row) => {
            const resultAccumulator = await resultPromise;

            const trx = await db.knex.transaction();
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

                if (row.complimentary_plan) {
                    await membersApi.members.setComplimentarySubscription(member, options);
                }

                if (row.stripe_customer_id) {
                    await membersApi.members.linkStripeCustomer({
                        customer_id: row.stripe_customer_id,
                        member_id: member.id
                    }, options);
                }
                await trx.commit();
                return {
                    ...resultAccumulator,
                    imported: resultAccumulator.imported + 1
                };
            } catch (error) {
                // The model layer can sometimes throw arrays of errors
                const errors = [].concat(error);
                const errorMessage = errors.map(({message}) => message).join(', ');
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
        const siteUrl = new URL(urlUtils.urlFor('home', null, true));
        const membersUrl = new URL('members', urlUtils.urlFor('admin', null, true));
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
        const job = await this.prepare(pathToCSV, headerMapping, globalLabels);

        if (job.batches <= 500 && !job.metadata.hasStripeData) {
            const result = await this.perform(job.id);
            const importLabelModel = result.imported ? await LabelModel.findOne(importLabel) : null;
            return {
                meta: {
                    stats: {
                        imported: result.imported,
                        invalid: result.errors
                    },
                    import_label: importLabelModel
                }
            };
        } else {
            const emailRecipient = user.email;
            jobsService.addJob({
                job: async () => {
                    const result = await this.perform(job.id);
                    const importLabelModel = result.imported ? await LabelModel.findOne(importLabel) : null;
                    const emailContent = this.generateCompletionEmail(result, {
                        emailRecipient,
                        importLabel: importLabelModel ? importLabelModel.toJSON() : null
                    });
                    const errorCSV = this.generateErrorCSV(result);
                    const emailSubject = result.imported > 0 ? 'Your member import is complete' : 'Your member import was unsuccessful';

                    await ghostMailer.send({
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

            return {};
        }
    }
};
