import {
  type FilterPredicate,
  type ParsedPredicate,
  getFieldKeysByType,
  hasFieldKey,
  isPredicateEnabled as isEnabled,
  parseFilterToAst,
  parseNodeToPredicates,
  serializePredicates,
  stampPredicates,
} from '@/shared/filters';
import { COMMENT_FIELD_CATALOG } from './comment-filter-catalog';

const TIMEZONE_SENSITIVE_COMMENT_FIELDS = getFieldKeysByType(COMMENT_FIELD_CATALOG, 'date');

function isPredicateEnabled(predicate: ParsedPredicate): boolean {
  return isEnabled(predicate, COMMENT_FIELD_CATALOG);
}

export function parseCommentFilter(
  filter: string | undefined,
  timezone: string,
): FilterPredicate[] {
  const ast = parseFilterToAst(filter ?? '');

  if (!ast) {
    return [];
  }

  return stampPredicates(
    parseNodeToPredicates(ast, COMMENT_FIELD_CATALOG, timezone).filter(isPredicateEnabled),
  );
}

export function hasTimezoneSensitiveCommentFilter(filter: string | undefined): boolean {
  const ast = parseFilterToAst(filter ?? '');

  if (!ast) {
    return false;
  }

  return hasFieldKey(ast, TIMEZONE_SENSITIVE_COMMENT_FIELDS);
}

export function serializeCommentFilters(
  predicates: FilterPredicate[],
  timezone: string,
): string | undefined {
  return serializePredicates(
    predicates.filter(isPredicateEnabled),
    COMMENT_FIELD_CATALOG,
    timezone,
  );
}
