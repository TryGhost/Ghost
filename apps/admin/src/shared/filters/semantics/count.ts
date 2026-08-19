import type {ValueSemantics} from './types';

export interface CountConfig {
    threshold: number;
    absentForm: 'equals' | 'below';
}

export type CountOperator = 'is';

const DEFAULT_COUNT_CONFIG: CountConfig = {threshold: 0, absentForm: 'equals'};

export function countSemantics(config: CountConfig = DEFAULT_COUNT_CONFIG): ValueSemantics<CountOperator> {
    const {threshold, absentForm} = config;
    const absent = absentForm === 'equals' ? `${threshold}` : `<${threshold + 1}`;

    return {
        operators: ['is'],
        serialize({operator, values}) {
            const value = values[0];

            if (operator !== 'is') {
                return null;
            }

            if (value === 'true') {
                return `>${threshold}`;
            }

            return value === 'false' ? absent : null;
        },
        parse({operator, value}) {
            if (operator === '$gt' && value === threshold) {
                return {operator: 'is', values: ['true']};
            }

            const matchesAbsent = absentForm === 'equals'
                ? operator === '$eq' && value === threshold
                : operator === '$lt' && value === threshold + 1;

            return matchesAbsent ? {operator: 'is', values: ['false']} : null;
        }
    };
}
