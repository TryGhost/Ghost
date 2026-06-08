export const DATE_FILTER_OPERATORS = ['is-less', 'is-or-less', 'is-greater', 'is-or-greater'] as const;

export const DATE_OPERATOR_LABELS: Record<typeof DATE_FILTER_OPERATORS[number], string> = {
    'is-less': 'before',
    'is-or-less': 'on or before',
    'is-greater': 'after',
    'is-or-greater': 'on or after'
};

export const DEFAULT_DATE_OPERATOR = 'is-or-less';
