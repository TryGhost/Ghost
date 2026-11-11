import { escapeNqlString } from '@tryghost/nql-string';
import type { NqlSymbol } from '@/shared/filters/nql-tokens';
import type { OperatorId } from '@/shared/filters/filter-operators';
import type { ValueSemantics } from './types';

const TEXT_OPERATOR_SYMBOLS = {
  contains: '~',
  'does-not-contain': '-~',
  'starts-with': '~^',
  'does-not-start-with': '-~^',
  'ends-with': '~$',
  'does-not-end-with': '-~$',
} as const satisfies Partial<Record<OperatorId, NqlSymbol>>;

const TEXT_SYMBOLS: Partial<Record<string, string>> = TEXT_OPERATOR_SYMBOLS;

export type TextOperator = 'is' | 'is-not' | keyof typeof TEXT_OPERATOR_SYMBOLS;
export const TEXT_OPERATORS = [
  'is',
  'is-not',
  'contains',
  'does-not-contain',
  'starts-with',
  'does-not-start-with',
  'ends-with',
  'does-not-end-with',
] as const satisfies readonly TextOperator[];

// Undoing what nql did on the way out. It escapes the user's text first and then adds the ^ or $
// marking "starts with" / "ends with", so we have to take them off in the opposite order — and a
// trailing $ only means "ends with" if it wasn't itself escaped, which is what the backslash
// counting is for. Someone searching for a literal "5$" would otherwise get "ends with 5".
function hasEndAnchor(source: string): boolean {
  if (!source.endsWith('$')) {
    return false;
  }

  let backslashes = 0;

  for (let index = source.length - 2; index >= 0 && source[index] === '\\'; index -= 1) {
    backslashes += 1;
  }

  return backslashes % 2 === 0;
}

function decomposeRegex(pattern: RegExp): {
  anchorStart: boolean;
  anchorEnd: boolean;
  value: string;
} {
  const source = pattern.source;
  const anchorStart = source.startsWith('^');
  const anchorEnd = hasEndAnchor(source);
  const body = source.slice(anchorStart ? 1 : 0, anchorEnd ? -1 : undefined);

  return {
    anchorStart,
    anchorEnd,
    value: body.replace(/\\([\\.^$|?*+()[\]{}/-])/g, '$1'),
  };
}

function anchorsToOperator(
  anchorStart: boolean,
  anchorEnd: boolean,
  negated: boolean,
): TextOperator {
  if (anchorStart && !anchorEnd) {
    return negated ? 'does-not-start-with' : 'starts-with';
  }

  if (anchorEnd && !anchorStart) {
    return negated ? 'does-not-end-with' : 'ends-with';
  }

  return negated ? 'does-not-contain' : 'contains';
}

/** How a field's text filter reads what was typed, beyond as written. */
export interface TextConfig {
  /**
   * What was typed, in the form the field holds its values in, so a filter compares like with
   * like: a phone field's whole number in E.164, say.
   */
  normalise?: (typed: string) => string;
}

export function textSemantics(config?: TextConfig): ValueSemantics<TextOperator> {
  return {
    operators: TEXT_OPERATORS,
    serialize({ operator, values }) {
      const typed = values[0];
      const rawValue =
        typeof typed === 'string' && config?.normalise ? config.normalise(typed) : typed;

      if (typeof rawValue !== 'string' || rawValue === '') {
        return null;
      }

      if (operator === 'is') {
        return escapeNqlString(rawValue);
      }

      if (operator === 'is-not') {
        return `-${escapeNqlString(rawValue)}`;
      }

      const symbol = TEXT_SYMBOLS[operator];

      if (!symbol) {
        return null;
      }

      return `${symbol}${escapeNqlString(rawValue)}`;
    },
    parse({ operator, value }) {
      if (operator === '$eq' && typeof value === 'string') {
        return { operator: 'is', values: [value] };
      }

      if (operator === '$ne' && typeof value === 'string') {
        return { operator: 'is-not', values: [value] };
      }

      if ((operator === '$regex' || operator === '$not') && value instanceof RegExp) {
        const { anchorStart, anchorEnd, value: text } = decomposeRegex(value);

        return {
          operator: anchorsToOperator(anchorStart, anchorEnd, operator === '$not'),
          values: [text],
        };
      }

      return null;
    },
  };
}
