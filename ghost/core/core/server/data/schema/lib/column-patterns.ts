import { z } from 'zod';

/**
 * The check constraint a string column's `pattern` becomes on MySQL, named after its table
 * and column, so the rule binds every writer rather than only the code that remembers it.
 */
export type PatternCheck = {
  constraintName: string;
  column: string;
  /**
   * The pattern as MySQL holds it. schema.js states it in JavaScript's syntax, where `$` is
   * the end of the value; MySQL's `$` also matches before a final line break, so each one
   * becomes `\z`, which does not.
   */
  pattern: string;
};

const ColumnSpec = z.object({
  pattern: z
    .string()
    .refine(isRegularExpression, { error: 'A column pattern is a regular expression.' })
    .transform((pattern, context) => {
      const forMySQL = asMySQLPattern(pattern);
      if (forMySQL === undefined) {
        context.addIssue({
          code: 'custom',
          message:
            'A column pattern escapes only punctuation: MySQL reads escapes such as `\\w` and `\\d` more broadly than JavaScript.',
        });
        return z.NEVER;
      }
      return forMySQL;
    })
    .optional(),
});

/**
 * Every pattern check on a table declared in schema.js. Throws on a pattern that is not a
 * regular expression, or that MySQL would read differently from JavaScript.
 */
export function patternChecksOf(
  tableName: string,
  tableSpec: Record<string, unknown>,
): PatternCheck[] {
  const columns = z
    .record(z.string(), ColumnSpec)
    .parse(
      Object.fromEntries(Object.entries(tableSpec).filter(([name]) => !name.startsWith('@@'))),
    );

  return Object.entries(columns).flatMap(([column, { pattern }]) =>
    pattern === undefined
      ? []
      : [{ constraintName: `${tableName}_${column}_check`, column, pattern }],
  );
}

function isRegularExpression(pattern: string): boolean {
  try {
    RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}

/**
 * The pattern with every `$` outside a character class written as `\z`, or undefined when it
 * escapes a letter or digit, which MySQL's regular expressions read differently.
 */
function asMySQLPattern(pattern: string): string | undefined {
  let result = '';
  let inClass = false;

  for (let i = 0; i < pattern.length; i += 1) {
    const char = pattern[i];
    if (char === '\\') {
      const escaped = pattern[i + 1] ?? '';
      if (/[\p{L}\p{N}]/u.test(escaped)) {
        return undefined;
      }
      result += char + escaped;
      i += 1;
    } else if (inClass) {
      inClass = char !== ']';
      result += char;
    } else {
      inClass = char === '[';
      result += char === '$' ? '\\z' : char;
    }
  }

  return result;
}
