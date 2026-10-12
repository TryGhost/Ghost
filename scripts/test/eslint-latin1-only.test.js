import { describe, it } from 'node:test';
import { RuleTester } from 'eslint';
import { localSourcePlugin } from '../../configs/eslint/index.mjs';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

// Built from code points so the test reads unambiguously (and formatters don't
// turn escapes back into look-alike characters).
const EM_DASH = String.fromCodePoint(0x2014);
const EN_DASH = String.fromCodePoint(0x2013);
const RIGHT_ARROW = String.fromCodePoint(0x2192);
const ELLIPSIS = String.fromCodePoint(0x2026);
const SNOWMAN = String.fromCodePoint(0x2603);
const E_OGONEK = String.fromCodePoint(0x0119);
const KEY = String.fromCodePoint(0x1f511);
const E_ACUTE = String.fromCodePoint(0x00e9);

const rule = localSourcePlugin.rules['latin1-only'];
const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
});

ruleTester.run('local-source/latin1-only', rule, {
  valid: [
    `const s = 'caf${E_ACUTE}';`,
    "const s = '\\u2014'; // a dash - in ASCII",
    'const re = /\\u2192/g;',
  ],
  invalid: [
    {
      code: `// one ${EM_DASH} two ${RIGHT_ARROW} three ${ELLIPSIS}\nconst a = 1;`,
      output: '// one - two -> three ...\nconst a = 1;',
      errors: 3,
    },
    {
      code: `/* ${SNOWMAN} */ const a = 1;`,
      output: '/* \\u2603 */ const a = 1;',
      errors: 1,
    },
    {
      code: `const s = '${EM_DASH}';`,
      output: "const s = '\\u2014';",
      errors: [{ messageId: 'nonLatin1' }],
    },
    {
      code: `const re = /${RIGHT_ARROW}/g;`,
      output: 'const re = /\\u2192/g;',
      errors: 1,
    },
    {
      code: `const t = \`\${a} ${EN_DASH} \${b}\`;`,
      output: 'const t = `${a} \\u2013 ${b}`;',
      errors: 1,
    },
    {
      // Outside the BMP: one report, a surrogate-pair escape.
      code: `const s = '${KEY}';`,
      output: "const s = '\\uD83D\\uDD11';",
      errors: 1,
    },
    {
      // A tag can read the raw text, so escaping would change the value.
      code: `const t = String.raw\`${EM_DASH}\`;`,
      output: null,
      errors: [{ messageId: 'nonLatin1NoFix' }],
    },
    {
      code: `const caf${E_OGONEK} = 1;`,
      output: null,
      errors: [{ messageId: 'nonLatin1NoFix' }],
    },
    {
      // An identity escape: rewriting the character would leave a stray backslash.
      code: `const s = '\\${EM_DASH}';`,
      output: null,
      errors: [{ messageId: 'nonLatin1NoFix' }],
    },
  ],
});
