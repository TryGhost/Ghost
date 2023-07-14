import Service, {inject as service} from '@ember/service';
import classic from 'ember-classic-decorator';
import validator from 'validator';
import {isEmpty} from '@ember/utils';

@classic
export default class MemberImportValidatorService extends Service {
    @service ajax;
    @service membersUtils;

    @service ghostPaths;

    check(data) {
        let sampledData = this._sampleData(data);
        let mapping = this._detectDataTypes(sampledData);
        return mapping;
    }

    /**
     * Method implements following sampling logic:
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
    }

    /**
     * Detects supported data types and auto-detects following needed for validation: email
     *
     * Returned "mapping" object contains mappings that could be accepted by the API
     * to map validated types.
     * @param {Array} data sampled data containing non empty values
     */
    _detectDataTypes(data) {
        const supportedTypes = [
            'email',
            'name',
            'note',
            'subscribed_to_emails',
            'complimentary_plan',
            'stripe_customer_id',
            'labels',
            'created_at'
        ];

        const autoDetectedTypes = [
            'email'
        ];

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

                if (!mapping.name && /name/.test(key)) {
                    mapping.name = key;
                    continue;
                }

                if (!mapping[key] && supportedTypes.includes(key) && !(autoDetectedTypes.includes(key))) {
                    mapping[key] = key;
                }
            }

            i += 1;
        }

        return mapping;
    }
}
