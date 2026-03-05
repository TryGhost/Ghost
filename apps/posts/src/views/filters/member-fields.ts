export const MEMBER_FIELD_OPERATORS = {
    label: ['is_any_of', 'is_none_of'],
    status: ['is', 'is_not'],
    name: ['contains', 'not_contains'],
    email: ['contains', 'not_contains']
} as const;

export type MemberField = keyof typeof MEMBER_FIELD_OPERATORS;

export type MemberOperator<TField extends MemberField> = (typeof MEMBER_FIELD_OPERATORS)[TField][number];

export interface MemberPredicate<TField extends MemberField = MemberField> {
    id: string;
    field: TField;
    operator: MemberOperator<TField>;
    values: string[];
}

let predicateIdCounter = 0;

export function createMemberPredicate<TField extends MemberField>(
    field: TField,
    operator: MemberOperator<TField>,
    values: string[]
): MemberPredicate<TField> {
    if (values.length === 0) {
        throw new Error('Member predicate requires at least one value');
    }

    predicateIdCounter += 1;

    return {
        id: `${field}-${predicateIdCounter}`,
        field,
        operator,
        values
    };
}
