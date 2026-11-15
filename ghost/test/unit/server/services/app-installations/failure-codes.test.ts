import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { APP_FAILURE_CODES } from '@tryghost/app-contracts';

const serviceRoot = path.resolve(
  __dirname,
  '../../../../../core/server/services/app-installations',
);

/** Every `'APP_…'` string in the service, parsed so that comments don't count. */
function codesInService(): Set<string> {
  const codes = new Set<string>();
  const files = readdirSync(serviceRoot, { recursive: true, encoding: 'utf8' });
  for (const file of files.filter((name) => name.endsWith('.ts') && !name.endsWith('.d.ts'))) {
    const text = readFileSync(path.join(serviceRoot, file), 'utf8');
    const visit = (node: ts.Node) => {
      if (ts.isStringLiteralLike(node) && /^APP_[A-Z_]+$/.test(node.text)) {
        codes.add(node.text);
      }
      ts.forEachChild(node, visit);
    };
    visit(ts.createSourceFile(file, text, ts.ScriptTarget.Latest));
  }
  return codes;
}

describe('app installation failure codes', function () {
  it('match the codes app-contracts lists for Admin', function () {
    const thrown = codesInService();
    // Thrown at boot, when the site's apps config is invalid, so it never reaches Admin.
    assert.ok(thrown.delete('APP_CONFIG_INVALID'));
    assert.deepEqual([...thrown].sort(), [...APP_FAILURE_CODES].sort());
  });
});
