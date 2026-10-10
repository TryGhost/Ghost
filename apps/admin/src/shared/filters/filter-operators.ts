export const VALUE_OPERATORS = [
  'is',
  'is-not',
  'contains',
  'does-not-contain',
  'starts-with',
  'does-not-start-with',
  'ends-with',
  'does-not-end-with',
  'is-any',
  'is-not-any',
  'is-greater',
  'is-or-greater',
  'is-less',
  'is-or-less',
  'in-the-last',
  'in-the-next',
] as const;

export type ValueOperator = (typeof VALUE_OPERATORS)[number];

export const PRESENCE_OPERATORS = ['is-set', 'is-not-set'] as const;

export type PresenceOperator = (typeof PRESENCE_OPERATORS)[number];

// The operators the engine itself knows how to offer. A field whose vocabulary is its own — a
// newsletter feedback score, say — names its operators in that vocabulary instead of widening
// this, which is why anything holding a vocabulary is generic over `string` rather than this.
export type OperatorId = ValueOperator | PresenceOperator;

// Asking whether a list of operators contains one. Spelled out rather than using `includes`,
// which refuses an arbitrary string when the list it is asked about is a fixed set.
export function listsOperator(operators: readonly string[], operator: string): boolean {
  return operators.some((candidate) => candidate === operator);
}
