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

export type CommentOperator<TField extends CommentField> = (typeof COMMENT_FIELD_OPERATORS)[TField][number];

export interface CommentPredicate<TField extends CommentField = CommentField> {
    id: string;
    field: TField;
    operator: CommentOperator<TField>;
    values: [string];
}

let predicateIdCounter = 0;

export function isCommentField(field: string): field is CommentField {
    return field in COMMENT_FIELD_OPERATORS;
}

export function isCommentOperatorForField<TField extends CommentField>(
    field: TField,
    operator: string
): operator is CommentOperator<TField> {
    return COMMENT_FIELD_OPERATORS[field].includes(operator as CommentOperator<TField>);
}

export function createCommentPredicate<TField extends CommentField>(
    field: TField,
    operator: CommentOperator<TField>,
    values: [string]
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
