import type { CodecContext } from '@/shared/filters/filter-types';

export interface ValueComparator {
  operator: string;
  value: unknown;
}

export interface ClauseFragment {
  key?: string;
  expression: string;
}

export interface WrittenValue {
  join?: 'and' | 'or';
  fragments: ClauseFragment[];
  /**
   * Each fragment is a condition of its own rather than part of one, so an addressing that
   * qualifies its value, such as a custom field naming itself beside it, writes the qualifier
   * beside every fragment.
   */
  each?: boolean;
}

export type SerializedValue = string | WrittenValue;

export interface EqualityClause {
  key: string;
  value: unknown;
}

export interface ClauseGroup {
  join: 'and' | 'or';
  clauses: readonly EqualityClause[];
}

export interface SemanticValue<TOperator extends string = string> {
  operator: TOperator;
  values: unknown[];
}

export interface ValueSemantics<TOperator extends string = string> {
  readonly operators: readonly TOperator[];
  serialize: (input: SemanticValue, ctx: CodecContext) => SerializedValue | null;
  parse: (comparator: ValueComparator, ctx: CodecContext) => SemanticValue<TOperator> | null;
  parseClauses?: (group: ClauseGroup, ctx: CodecContext) => SemanticValue<TOperator> | null;
}

export interface ValueConfig {
  quoteStrings?: boolean;
  serializeSingletonAsScalar?: boolean;
}
