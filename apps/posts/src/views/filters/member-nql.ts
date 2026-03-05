import {canonicalizeFilter} from './canonical-filter';
import type {MemberOperator, MemberPredicate} from './member-fields';

function getRelationPrefix(operator: MemberOperator<'label' | 'status'>): '' | '-' {
    return (operator === 'is_not' || operator === 'is_none_of') ? '-' : '';
}

function escapeNqlString(value: string): string {
    return `'${value.replace(/'/g, '\\\'')}'`;
}

function toMemberClause(predicate: MemberPredicate): string {
    switch (predicate.field) {
    case 'label': {
        const relation = getRelationPrefix(predicate.operator);
        return `label:${relation}[${predicate.values.join(',')}]`;
    }

    case 'status': {
        const relation = getRelationPrefix(predicate.operator);
        return `status:${relation}${predicate.values[0]}`;
    }

    case 'name':
    case 'email': {
        const value = escapeNqlString(predicate.values[0]);
        if (predicate.operator === 'contains') {
            return `${predicate.field}:~${value}`;
        }

        return `${predicate.field}:-~${value}`;
    }
    }
}

export function serializeMemberPredicates(predicates: MemberPredicate[]): string | undefined {
    const clauses = predicates.map(toMemberClause);
    return canonicalizeFilter(clauses);
}
