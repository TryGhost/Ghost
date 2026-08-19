
export const NQL_SYMBOLS = ['', '-', '>', '>=', '<', '<=', '~', '-~', '~^', '-~^', '~$', '-~$'] as const;

export type NqlSymbol = typeof NQL_SYMBOLS[number];

export const NQL_COMPARATORS = ['$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin', '$regex', '$not'] as const;

export type NqlComparator = typeof NQL_COMPARATORS[number];
