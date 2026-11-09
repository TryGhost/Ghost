import { z } from 'zod';
import { columnsOf } from './columns';

/**
 * The check constraint a string column's `pattern` becomes on MySQL, named after its table
 * and column, so the rule binds every writer rather than only the code that remembers it.
 */
export type PatternCheck = {
  constraintName: string;
  column: string;
  /**
   * The pattern as MySQL holds it. schema.js states it in JavaScript's syntax; here it
   * matches case-sensitively whatever the column's collation, and each `$` that ends the
   * value is written `\z`, because MySQL's `$` also matches before a final line break.
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
            "A column pattern must read the same in MySQL as in JavaScript, so it can't escape a letter or digit, such as `\\w`, or put `[`, `&&` or `--` inside a character class.",
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
  return Object.entries(columnsOf(tableSpec, ColumnSpec)).flatMap(([column, { pattern }]) =>
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
 * The pattern as MySQL should hold it, or undefined when MySQL would read it differently:
 * MySQL reads an escaped letter or digit such as `\w` more broadly, and reads `[`, `&&` and
 * `--` inside a character class as a nested class, a POSIX class or a set operation.
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
      if (char === '[' || ((char === '&' || char === '-') && pattern[i + 1] === char)) {
        return undefined;
      }
      inClass = char !== ']';
      result += char;
    } else {
      inClass = char === '[';
      result += char === '$' ? '\\z' : char;
    }
  }

  return `(?-i)${result}`;
}
