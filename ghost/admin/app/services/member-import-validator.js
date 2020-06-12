import MemberImportError from 'ghost-admin/errors/member-import-error';
import Service, {inject as service} from '@ember/service';
import validator from 'validator';

export default Service.extend({
    ajax: service(),
    membersUtils: service(),
    ghostPaths: service(),

    async check(data) {
        if (!data || !data.length) {
            return [new MemberImportError('File is empty, nothing to import. Please select a different file.')];
        }

        let validatedSet = [];
        let validationSampleSize = 15;
        let validationResults = [];

        if (data && data.length > validationSampleSize) {
            // validated data size is larger than sample size take 3
            // equal parts from head, tail and middle of the data set
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
        } else {
            validatedSet = data;
        }

        // check can be done on whole set as it won't be too slow
        let emailValidation = this._checkEmails(data);
        if (emailValidation !== true) {
            validationResults.push(new MemberImportError('Emails in provided data don\'t appear to be valid email addresses.'));
        }

        const hasStripeId = this._containsRecordsWithStripeId(validatedSet);

        if (hasStripeId) {
            // check can be done on whole set as it won't be too slow
            let hasDuplicateStripeIds = this._hasDuplicateStripeIds(data);
            if (hasDuplicateStripeIds === true) {
                validationResults.push(new MemberImportError('Some members will not be imported. Members with duplicate Stripe customer ids are not allowed.'));
            }

            if (!this.membersUtils.isStripeEnabled) {
                validationResults.push(new MemberImportError('Stripe customer IDs exist in the data, but no stripe account is connected.'));
            } else {
                let stripeSeverValidation = await this._checkStripeServer(validatedSet);
                if (stripeSeverValidation !== true) {
                    validationResults.push(new MemberImportError('Stripe customer IDs exist in the data, but we could not find such customer in connected Stripe account'));
                }
            }
        }

        if (validationResults.length) {
            return validationResults;
        } else {
            return true;
        }
    },

    _containsRecordsWithStripeId(validatedSet) {
        let memberWithStripeId = validatedSet.find(m => !!(m.stripe_customer_id));
        return !!memberWithStripeId;
    },

    _checkEmails(validatedSet) {
        let result = true;

        validatedSet.forEach((member) => {
            if (!member.email) {
                result = false;
            }

            if (member.email && !validator.isEmail(member.email)) {
                result = false;
            }
        });

        return result;
    },

    _hasDuplicateStripeIds(validatedSet) {
        const customersMap = validatedSet.reduce((acc, member) => {
            if (member.stripe_customer_id && member.stripe_customer_id !== 'undefined') {
                if (acc[member.stripe_customer_id]) {
                    acc[member.stripe_customer_id] += 1;
                } else {
                    acc[member.stripe_customer_id] = 1;
                }
            }

            return acc;
        }, {});

        for (const key in customersMap) {
            if (customersMap[key] > 1) {
                return true;
            }
        }
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

    async _checkStripeServer(validatedSet) {
        const url = this.ghostPaths.get('url').api('members/upload/validate');

        let response;
        try {
            response = await this.ajax.post(url, {
                data: {
                    members: validatedSet
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
