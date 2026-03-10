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
    values: string[];
}

export function isCommentField(field: string): field is CommentField {
    return field in COMMENT_FIELD_OPERATORS;
}

export function isCommentOperatorForField<TField extends CommentField>(
    field: TField,
    operator: string
): operator is CommentOperator<TField> {
    return COMMENT_FIELD_OPERATORS[field].includes(operator as CommentOperator<TField>);
}
