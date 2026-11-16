import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  relocated,
  rewriteSpecifiers,
  stringPathsNeedingEdits,
  type Move,
} from '../lib/relocate.ts';

const moves: Move[] = [
  { from: 'ghost/core/server/services/gifts', to: 'ghost/domains/shop/transition/services/gifts' },
  { from: 'ghost/core/server/models/gift.js', to: 'ghost/domains/shop/transition/models/gift.js' },
];

describe('relocate', () => {
  it('maps a folder, the files in it, a file, and a file named without its extension', () => {
    assert.equal(
      relocated('ghost/core/server/services/gifts', moves),
      'ghost/domains/shop/transition/services/gifts',
    );
    assert.equal(
      relocated('ghost/core/server/services/gifts/api/index.ts', moves),
      'ghost/domains/shop/transition/services/gifts/api/index.ts',
    );
    assert.equal(
      relocated('ghost/core/server/models/gift', moves),
      'ghost/domains/shop/transition/models/gift',
    );
    // A neighbour with the same prefix does not move.
    assert.equal(
      relocated('ghost/core/server/services/gifts-old/index.ts', moves),
      'ghost/core/server/services/gifts-old/index.ts',
    );
    assert.equal(
      relocated('ghost/core/server/models/gift-link.js', moves),
      'ghost/core/server/models/gift-link.js',
    );
  });

  it('rewrites specifiers in a moved file that point outside the move', () => {
    const source = [
      "import { defineService } from '../../../kernel/define-service';",
      "const models = require('../../models');",
      "const { Gift } = require('./gift');",
      "import type { Api } from './api';",
    ].join('\n');
    assert.equal(
      rewriteSpecifiers(source, 'ghost/core/server/services/gifts/index.ts', moves),
      [
        "import { defineService } from '../../../../../core/kernel/define-service';",
        "const models = require('../../../../../core/server/models');",
        // Files that move together keep their specifiers.
        "const { Gift } = require('./gift');",
        "import type { Api } from './api';",
      ].join('\n'),
    );
  });

  it('rewrites specifiers elsewhere that point at something that moved', () => {
    const source = [
      "const gifts = require('./server/services/gifts').default;",
      "const { Gift } = require('./server/models/gift');",
      "const other = require('./server/services/offers');",
      "type Root = typeof import('./server/services/gifts/index');",
      "vi.mock('./server/services/gifts/api');",
      "const file = require.resolve('./server/services/gifts');",
      "export { thing } from './server/services/gifts/thing';",
      "await import('./server/services/gifts/lazy.js');",
    ].join('\n');
    assert.equal(
      rewriteSpecifiers(source, 'ghost/core/boot.js', moves),
      [
        "const gifts = require('../domains/shop/transition/services/gifts').default;",
        "const { Gift } = require('../domains/shop/transition/models/gift');",
        "const other = require('./server/services/offers');",
        "type Root = typeof import('../domains/shop/transition/services/gifts/index');",
        "vi.mock('../domains/shop/transition/services/gifts/api');",
        "const file = require.resolve('../domains/shop/transition/services/gifts');",
        "export { thing } from '../domains/shop/transition/services/gifts/thing';",
        "await import('../domains/shop/transition/services/gifts/lazy.js');",
      ].join('\n'),
    );
  });

  it('leaves package imports and unrelated relative imports alone', () => {
    const source = "import errors from '@tryghost/errors';\nconst x = require('./local');\n";
    assert.equal(rewriteSpecifiers(source, 'ghost/core/server/lib/thing.js', moves), source);
  });

  it('reports paths built from strings instead of rewriting them', () => {
    const source = [
      "const fixture = path.join(__dirname, '../../core/server/services/gifts/templates');",
      "const other = path.resolve(__dirname, '../utils');",
    ].join('\n');
    assert.deepEqual(stringPathsNeedingEdits(source, 'ghost/test/unit/gifts.test.js', moves), [
      '../../core/server/services/gifts/templates',
    ]);
    assert.equal(rewriteSpecifiers(source, 'ghost/test/unit/gifts.test.js', moves), source);
  });
});
