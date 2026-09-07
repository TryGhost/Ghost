import { DATE_OPERATOR_LABELS, DEFAULT_DATE_OPERATOR } from './filter-date';
import {
  PLAIN_DATE_OPERATORS,
  TIMESTAMP_OPERATORS,
  SCALAR_VALUE_OPERATORS,
  SET_VALUE_OPERATORS,
  countSemantics,
  dateSemantics,
  numberSemantics,
  plainDateSemantics,
  scalarSemantics,
  setSemantics,
  textSemantics,
} from './semantics';
import type { FilterControl } from './filter-types';
import type { OperatorId } from './filter-operators';
import type { ValueSemantics } from './semantics';

export interface FilterTypeDefinition<TOperator extends OperatorId = OperatorId, TConfig = void> {
  semantics: (config?: TConfig) => ValueSemantics<TOperator>;
  operators: readonly TOperator[];
  control: FilterControl;
  labels?: Partial<Record<TOperator, string>>;
  defaultOperator?: OperatorId;
}

function defineFilterType<TOperator extends OperatorId, TConfig>(definition: {
  semantics: (config?: TConfig) => ValueSemantics<TOperator>;
  operators: readonly NoInfer<TOperator>[];
  control: FilterControl;
  labels?: Partial<Record<NoInfer<TOperator>, string>>;
  defaultOperator?: NoInfer<TOperator>;
}): FilterTypeDefinition<TOperator, TConfig> {
  return definition;
}

export const FILTER_TYPES = {
  text: defineFilterType({
    semantics: textSemantics,
    operators: ['is', 'is-not', 'contains', 'does-not-contain', 'starts-with', 'ends-with'],
    control: 'text',
    defaultOperator: 'contains',
  }),
  scalar: defineFilterType({
    semantics: scalarSemantics,
    operators: SCALAR_VALUE_OPERATORS,
    control: 'select',
  }),
  set: defineFilterType({
    semantics: setSemantics,
    operators: SET_VALUE_OPERATORS,
    control: 'multiselect',
    defaultOperator: 'is-any',
  }),
  number: defineFilterType({
    semantics: numberSemantics,
    operators: ['is', 'is-greater', 'is-less'],
    control: 'number',
    labels: { 'is-greater': 'is greater than', 'is-less': 'is less than' },
  }),
  timestamp: defineFilterType({
    semantics: dateSemantics,
    operators: TIMESTAMP_OPERATORS,
    control: 'date',
    labels: DATE_OPERATOR_LABELS,
    defaultOperator: DEFAULT_DATE_OPERATOR,
  }),
  plain_date: defineFilterType({
    semantics: plainDateSemantics,
    operators: PLAIN_DATE_OPERATORS,
    control: 'date',
    labels: DATE_OPERATOR_LABELS,
    defaultOperator: DEFAULT_DATE_OPERATOR,
  }),
  count: defineFilterType({
    semantics: countSemantics,
    operators: ['is'],
    control: 'select',
  }),
} as const;

export type FilterTypeId = keyof typeof FILTER_TYPES;

export interface FilterTypeFacts {
  operators: readonly OperatorId[];
  control: FilterControl;
  labels?: Partial<Record<OperatorId, string>>;
  defaultOperator?: OperatorId;
}

export function filterType(id: FilterTypeId): FilterTypeFacts {
  return FILTER_TYPES[id];
}

export type ConfigOf<TType extends FilterTypeId> = Parameters<
  (typeof FILTER_TYPES)[TType]['semantics']
>[0];
