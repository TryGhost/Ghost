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
