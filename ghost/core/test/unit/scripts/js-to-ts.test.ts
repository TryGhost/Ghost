import assert from 'node:assert/strict';

import { convertToTypeScript, isPureStatement } from '../../../scripts/js-to-ts/codemod';
import { checkEquivalence } from '../../../scripts/js-to-ts/equivalence';
import type { ModuleKind } from '../../../scripts/js-to-ts/module-kind';

const getModuleKind = (_fromFile: string, specifier: string): ModuleKind => {
  if (specifier.startsWith('esm')) {
    return 'esm';
  }
  if (specifier.startsWith('unknown')) {
    return 'unknown';
  }
  return 'cjs';
};

function convert(source: string): string {
  const result = convertToTypeScript('/project/file.js', source, getModuleKind);
  assert.ok(result.ok, result.ok ? undefined : result.reason);
  return result.output;
}

function refusal(source: string): string {
  const result = convertToTypeScript('/project/file.js', source, getModuleKind);
  assert.ok(!result.ok, 'expected the codemod to refuse');
  return result.reason;
}

function isEquivalent(original: string, converted: string) {
  return checkEquivalence(
    '/project/file.js',
    original,
    '/project/file.ts',
    converted,
    {},
    isPureStatement,
    getModuleKind,
  );
}

describe('js-to-ts', function () {
  describe('convertToTypeScript', function () {
    it('converts requires to imports', function () {
      assert.equal(
        convert(
          [
            "'use strict';",
            '',
            "const cjs = require('cjs');",
            "const esm = require('esm');",
            "const esmDefault = require('esm').default;",
            "const { a, b: c } = require('cjs');",
            "const d = require('cjs').d;",
            "const e = require('cjs').f;",
            "require('side-effect');",
            '',
            'cjs(esm, esmDefault, a, c, d, e);',
          ].join('\n'),
        ),
        [
          "import cjs from 'cjs';",
          "import * as esm from 'esm';",
          "import esmDefault from 'esm';",
          "import { a, b as c } from 'cjs';",
          "import { d } from 'cjs';",
          "import { f as e } from 'cjs';",
          "import 'side-effect';",
          '',
          'cjs(esm, esmDefault, a, c, d, e);',
        ].join('\n'),
      );
    });

    it('keeps comments around converted requires', function () {
      assert.equal(
        convert("// Comment\nconst a = require('a'); // Trailing\n"),
        "// Comment\nimport a from 'a'; // Trailing\n",
      );
    });

    it('converts requires that follow pure statements', function () {
      assert.equal(
        convert("const TIMEOUT = 5;\nfunction noop() {}\nconst a = require('a');\n"),
        "const TIMEOUT = 5;\nfunction noop() {}\nimport a from 'a';\n",
      );
    });

    it('leaves requires that follow side effects', function () {
      assert.equal(
        convert("const a = require('a');\na.setup();\nconst b = require('b');\n"),
        "import a from 'a';\na.setup();\nconst b = require('b');\n",
      );
    });

    it('stops at requires it cannot convert', function () {
      for (const statement of [
        "let a = require('a');",
        "const a = require('unknown');",
        "const a = require('cjs').default;",
        "const { a = 1 } = require('a');",
        "const { ...a } = require('a');",
        "const a = require('a'), b = require('b');",
        "const a = require('a' /* comment */);",
      ]) {
        const source = `${statement}\nconst c = require('c');\n`;
        assert.equal(convert(source), `${source.trimEnd()}\n\nexport {};\n`, statement);
      }
    });

    it('converts module.exports to exports', function () {
      assert.equal(
        convert(
          "const a = require('a');\nfunction b() {}\nconst c = 1;\nmodule.exports = { a: b, c };\n",
        ),
        "import a from 'a';\nfunction b() {}\nconst c = 1;\nexport { b as a, c };\n",
      );
    });

    it('refuses module.exports that are not top-level constants', function () {
      assert.match(refusal('module.exports = function () {};'), /module\.exports/);
      assert.match(refusal('let a = 1;\nmodule.exports = { a };'), /module\.exports/);
      assert.match(refusal("const a = require('a');\nmodule.exports = { a };"), /module\.exports/);
    });

    it('refuses CommonJS-only references', function () {
      assert.match(refusal('module.exports.a = 1;'), /`module`/);
      assert.match(refusal('exports.a = 1;'), /`exports`/);
      assert.match(refusal('this.a = 1;'), /`this`/);
      assert.match(refusal('const a = () => this;'), /`this`/);
      assert.match(refusal('console.log(arguments);'), /`arguments`/);
    });

    it('allows this and arguments inside functions', function () {
      convert('function a() { return [this, arguments]; }\nclass B { c = this; }\n');
    });

    it('marks files without imports or exports as modules', function () {
      assert.equal(convert('describe();\n'), 'describe();\n\nexport {};\n');
    });
  });

  describe('checkEquivalence', function () {
    it('accepts a faithful conversion', function () {
      const original = [
        "const assert = require('cjs/assert');",
        "const esm = require('esm');",
        "const esmDefault = require('esm-default').default;",
        "const { a, b: c } = require('cjs');",
        "const d = require('cjs').d;",
        'function e() {}',
        'assert({ a, c, d, esm, esmDefault }, new esmDefault.Thing());',
        'module.exports = { e };',
      ].join('\n');
      const converted = [
        "import assert from 'cjs/assert';",
        "import * as esm from 'esm';",
        "import esmDefault from 'esm-default';",
        "import { a, b as c } from 'cjs';",
        "import { d } from 'cjs';",
        'function e() {}',
        'assert({ a, c, d, esm, esmDefault }, new esmDefault.Thing(), );',
        'export { e };',
      ].join('\n');
      assert.deepEqual(isEquivalent(original, converted), { equivalent: true });
    });

    it('ignores formatting, comments, and type annotations', function () {
      assert.deepEqual(
        isEquivalent(
          "const a = require('a');\nfunction f(x) { return a(x); }\n",
          'import a from "a";\n\n// Comment\nfunction f(\n  x: string,\n) {\n  return a(x);\n}\n',
        ),
        { equivalent: true },
      );
    });

    it('rejects a default import of an ES module', function () {
      const result = isEquivalent("const a = require('esm');\na();", "import a from 'esm';\na();");
      assert.equal(result.equivalent, false);
    });

    it('rejects a namespace import of a CommonJS module', function () {
      const result = isEquivalent(
        "const a = require('cjs');\na();",
        "import * as a from 'cjs';\na();",
      );
      assert.equal(result.equivalent, false);
    });

    it('rejects changed behavior', function () {
      const result = isEquivalent("const a = require('a');\na(1);", "import a from 'a';\na(2);");
      assert.equal(result.equivalent, false);
      assert.equal(result.equivalent === false && result.reason, 'compiled output differs');
    });

    it('rejects a missing require', function () {
      const result = isEquivalent("const a = require('a');\nrequire('b');", "import a from 'a';");
      assert.equal(result.equivalent, false);
    });

    it('rejects different exports', function () {
      const result = isEquivalent(
        'const a = 1;\nconst b = 2;\nmodule.exports = { a };',
        'const a = 1;\nconst b = 2;\nexport { b as a };',
      );
      assert.equal(result.equivalent, false);
    });

    it('rejects imports that follow side effects', function () {
      const result = isEquivalent(
        "setup();\nconst a = require('a');",
        "setup();\nimport a from 'a';",
      );
      assert.equal(result.equivalent, false);
      assert.match(result.equivalent === false ? result.reason : '', /follows side effects/);
    });

    it('rejects references to module or exports', function () {
      const result = isEquivalent('module.exports.a = 1;', 'module.exports.a = 1;\nexport {};');
      assert.equal(result.equivalent, false);
    });
  });
});
