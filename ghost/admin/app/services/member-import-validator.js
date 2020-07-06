import MemberImportError from 'ghost-admin/errors/member-import-error';
import Service, {inject as service} from '@ember/service';
import validator from 'validator';
import {isEmpty} from '@ember/utils';

export default Service.extend({
    ajax: service(),
    membersUtils: service(),
    ghostPaths: service(),

    async check(data) {
        if (!data || !data.length) {
            return {
                validationErrors: [new MemberImportError({
                    message: 'File is empty, nothing to import. Please select a different file.'
                })]
            };
        }

        let sampledData = this._sampleData(data);
        let mapping = this._detectDataTypes(sampledData);

        let validationErrors = [];

        const hasStripeIds = !!mapping.stripe_customer_id;
        const hasEmails = !!mapping.email;

        if (!hasEmails) {
            validationErrors.push(new MemberImportError({
                message: 'No email addresses found in provided data.'
            }));
        } else {
            // check can be done on whole set as it won't be too slow
            const {invalidCount, emptyCount, duplicateCount} = this._checkEmails(data, mapping);
            if (invalidCount) {
                validationErrors.push(new MemberImportError({
                    message: `Invalid email address (${invalidCount})`,
                    type: 'warning'
                }));
            }

            if (emptyCount) {
                validationErrors.push(new MemberImportError({
                    message: `Missing email address (${emptyCount})`,
                    type: 'warning'
                }));
            }

            if (duplicateCount) {
                validationErrors.push(new MemberImportError({
                    message: `Duplicate email address (${duplicateCount})`,
                    type: 'warning'
                }));
            }
        }

        if (hasStripeIds) {
            // check can be done on whole set as it won't be too slow
            const {totalCount, duplicateCount} = this._checkStripeIds(data, mapping);

            if (!this.membersUtils.isStripeEnabled) {
                validationErrors.push(new MemberImportError({
                    message: 'Missing stripe connection',
                    context: `${totalCount} Stripe customers won't be imported. You need to <a href="#/settings/labs">connect to Stripe</a> to import stripe customers.`,
                    type: 'warning'
                }));
            } else {
                let stripeSeverValidation = await this._checkStripeServer(sampledData, mapping);
                if (stripeSeverValidation !== true) {
                    validationErrors.push(new MemberImportError({
                        message: 'Wrong Stripe account',
                        context: `The CSV contains Stripe customers from a different Stripe account. These members will not be imported. Make sure you're connected to the correct <a href="#/settings/labs">Stripe account</a>.`,
                        type: 'warning'
                    }));
                }
            }

            if (duplicateCount) {
                validationErrors.push(new MemberImportError({
                    message: `Duplicate Stripe ID (${duplicateCount})`,
                    type: 'warning'
                }));
            }
        }

        return {validationErrors, mapping};
    },

    /**
     * Method implements foollowing sampling logic:
     * Locate 10 non-empty cells from the start/middle(ish)/end of each column (30 non-empty values in total).
     * If the data contains 30 rows or fewer, all rows should be validated.
     *
     * @param {Array} data JSON objects mapped from CSV file
     */
    _sampleData(data, validationSampleSize = 30) {
        let validatedSet = [{}];

        if (data && data.length > validationSampleSize) {
            let sampleKeys = Object.keys(data[0]);

            sampleKeys.forEach(function (key) {
                const nonEmptyKeyEntries = data.filter(entry => !isEmpty(entry[key]));
                let sampledEntries = [];

                if (nonEmptyKeyEntries.length <= validationSampleSize) {
                    sampledEntries = nonEmptyKeyEntries;
                } else {
                    // take 3 equal parts from head, tail and middle of the data set
                    const partitionSize = validationSampleSize / 3;

                    const head = data.slice(0, partitionSize);
                    const tail = data.slice((data.length - partitionSize), data.length);

                    const middleIndex = Math.floor(data.length / 2);
                    const middleStartIndex = middleIndex - 2;
                    const middleEndIndex = middleIndex + 3;
                    const middle = data.slice(middleStartIndex, middleEndIndex);

                    validatedSet.push(...head);
                    validatedSet.push(...middle);
                    validatedSet.push(...tail);
                }

                sampledEntries.forEach((entry, index) => {
                    if (!validatedSet[index]) {
                        validatedSet[index] = {};
                    }

                    validatedSet[index][key] = entry[key];
                });
            });
        } else {
            validatedSet = data;
        }

        return validatedSet;
    },

    /**
     * Detects validated data types:
     *  1. email
     *  2. stripe_customer_id
     *
     * Returned "mapping" object contains mappings that could be accepted by the API
     * to map validated types.
     * @param {Array} data sampled data containing non empty values
     */
    _detectDataTypes(data) {
        let mapping = {};
        let i = 0;
        // loopping through all sampled data until needed data types are detected
        while (i <= (data.length - 1)) {
            if (mapping.email && mapping.stripe_customer_id) {
                break;
            }

            let entry = data[i];
            for (const [key, value] of Object.entries(entry)) {
                if (!mapping.email && validator.isEmail(value)) {
                    mapping.email = key;
                    continue;
                }

                if (!mapping.stripe_customer_id && value && value.startsWith && value.startsWith('cus_')) {
                    mapping.stripe_customer_id = key;
                    continue;
                }
            }

            i += 1;
        }

        return mapping;
    },

    _containsRecordsWithStripeId(validatedSet) {
        let memberWithStripeId = validatedSet.find(m => !!(m.stripe_customer_id));
        return !!memberWithStripeId;
    },

    _checkEmails(validatedSet, mapping) {
        let emptyCount = 0;
        let invalidCount = 0;
        let duplicateCount = 0;
        let emailMap = {};

        validatedSet.forEach((member) => {
            let emailValue = member[mapping.email];
            if (!emailValue) {
                emptyCount += 1;
            }

            if (emailValue && !validator.isEmail(emailValue)) {
                invalidCount += 1;
            } else if (emailValue) {
                if (emailMap[emailValue]) {
                    emailMap[emailValue] += 1;
                    duplicateCount += 1;
                } else {
                    emailMap[emailValue] = 1;
                }
            }
        });

        return {invalidCount, emptyCount, duplicateCount};
    },

    _countStripeRecors(validatedSet, mapping) {
        let count = 0;

        validatedSet.forEach((member) => {
            if (!isEmpty(member[mapping.stripe_customer_id])) {
                count += 1;
            }
        });

        return count;
    },

    _checkStripeIds(validatedSet, mapping) {
        let totalCount = 0;
        let duplicateCount = 0;

        validatedSet.reduce((acc, member) => {
            let stripeCustomerIdValue = member[mapping.stripe_customer_id];

            if (stripeCustomerIdValue && stripeCustomerIdValue !== 'undefined') {
                totalCount += 1;

                if (acc[stripeCustomerIdValue]) {
                    acc[stripeCustomerIdValue] += 1;
                    duplicateCount += 1;
                } else {
                    acc[stripeCustomerIdValue] = 1;
                }
            }

            return acc;
        }, {});

        return {totalCount, duplicateCount};
    },

    _checkContainsStripeIDs(validatedSet) {
        let result = true;

        if (!this.membersUtils.isStripeEnabled) {
            validatedSet.forEach((member) => {
                if (member.stripe_customer_id) {
                    result = false;
                }
            });
        }

        return result;
    },

    async _checkStripeServer(validatedSet, mapping) {
        const url = this.ghostPaths.get('url').api('members/upload/validate');
        const mappedValidatedSet = validatedSet.map((entry) => {
            return {
                stripe_customer_id: entry[mapping.stripe_customer_id]
            };
        });

        let response;
        try {
            response = await this.ajax.post(url, {
                data: {
                    members: mappedValidatedSet
                }
            });
        } catch (e) {
            return false;
        }

        if (response.errors) {
            return false;
        }

        return true;
    }
});
