const COMMENT_FIELD_OPERATORS = {
    id: ['is'],
    status: ['is'],
    created_at: ['is', 'before', 'after'],
    body: ['contains', 'not_contains'],
    post: ['is', 'is_not'],
    author: ['is', 'is_not'],
    reported: ['is']
} as const;

export const COMMENT_FIELDS = Object.keys(COMMENT_FIELD_OPERATORS) as Array<keyof typeof COMMENT_FIELD_OPERATORS>;

export type CommentField = keyof typeof COMMENT_FIELD_OPERATORS;
type CommentDateField = 'created_at';
type CommentStatusField = 'status';
type CommentReportedField = 'reported';
type CommentDateValue = `${number}-${number}-${number}`;
type CommentStatusValue = 'published' | 'hidden';
type CommentReportedValue = 'true' | 'false';
export type CommentPredicateValues<TField extends CommentField> =
    TField extends CommentDateField ? [CommentDateValue]
        : TField extends CommentStatusField ? [CommentStatusValue]
            : TField extends CommentReportedField ? [CommentReportedValue]
                : [string];

export type CommentOperator<TField extends CommentField> = (typeof COMMENT_FIELD_OPERATORS)[TField][number];

export interface CommentPredicate<TField extends CommentField = CommentField> {
    id: string;
    field: TField;
    operator: CommentOperator<TField>;
    values: CommentPredicateValues<TField>;
}

export type CommentQuickFilterField = 'author' | 'post';

let predicateIdCounter = 0;

export function isCommentField(field: string): field is CommentField {
    return field in COMMENT_FIELD_OPERATORS;
}

export function isCommentOperatorForField<TField extends CommentField>(
    field: TField,
    operator: string
): operator is CommentOperator<TField> {
    const operators: readonly string[] = COMMENT_FIELD_OPERATORS[field];

    return operators.includes(operator);
}

export function createCommentPredicate<TField extends CommentField>(
    field: TField,
    operator: CommentOperator<TField>,
    values: CommentPredicateValues<TField>
): CommentPredicate<TField> {
    if (!isCommentOperatorForField(field, operator)) {
        throw new Error(`Invalid operator "${operator}" for comment field "${field}"`);
    }

    predicateIdCounter += 1;

    return {
        id: `${field}-${predicateIdCounter}`,
        field,
        operator,
        values
    };
}

export function upsertCommentFieldPredicate<TField extends CommentField>(
    predicates: CommentPredicate[],
    field: TField,
    operator: CommentOperator<TField>,
    values: CommentPredicateValues<TField>
): CommentPredicate[] {
    const nextPredicate = createCommentPredicate(field, operator, values);

    return [
        ...predicates.filter(predicate => predicate.field !== field),
        nextPredicate
    ];
}
