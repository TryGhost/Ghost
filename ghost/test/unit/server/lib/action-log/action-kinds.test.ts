import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { ActionKind } from '../../../../../core/server/lib/action-log/action-log';
import { createLoggingFake } from '../../../../utils/logging-utils';

const schema = require('../../../../../core/server/data/schema/schema');
const models = require('../../../../../core/server/models');
// Required, not imported, so this is the same module instance the Action model reads the
// registered kinds from, as it is when Ghost runs.
const {
  ActionLog,
  registeredKinds,
}: typeof import('../../../../../core/server/lib/action-log/action-log') = require('../../../../../core/server/lib/action-log/action-log');

const SERVER = path.resolve(__dirname, '../../../../../core/server');

interface Declaration {
  file: string;
  kind: ActionKind;
}

function isKind(value: unknown): value is ActionKind {
  return (
    typeof value === 'object' &&
    value !== null &&
    'resourceType' in value &&
    'table' in value &&
    'actionNames' in value
  );
}

// Each service declares its own kind, so there's no list of them to read. They're found the way
// a reader finds them: by searching for `as const satisfies ActionKind`.
function declarations(): Declaration[] {
  return fs
    .readdirSync(SERVER, { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.ts') && !file.endsWith('.d.ts'))
    .filter((file) =>
      /as const satisfies ActionKind\b/.test(fs.readFileSync(path.join(SERVER, file), 'utf8')),
    )
    .flatMap((file) =>
      Object.values(require(path.join(SERVER, file)) as Record<string, unknown>)
        .filter(isKind)
        .map((kind) => ({ file, kind })),
    );
}

describe('Unit: action kinds declared by services', function () {
  const declared = declarations();

  it('finds the declarations', function () {
    assert.ok(declared.length >= 4, `found ${declared.length} declarations`);
  });

  it('points every kind at a table in the schema', function () {
    for (const { file, kind } of declared) {
      assert.ok(schema[kind.table], `${file} points at ${kind.table}, which is not a table`);
    }
  });

  it('gives each resource type one declaration', function () {
    const byType = Map.groupBy(declared, ({ kind }) => kind.resourceType);
    for (const [resourceType, claims] of byType) {
      assert.equal(
        claims.length,
        1,
        `${resourceType} is declared by ${claims.map(({ file }) => file).join(' and ')}`,
      );
    }
  });

  it("doesn't claim a resource type a Bookshelf model logs as", function () {
    const bookshelfTypes = new Set(
      models.Action.forge()
        .candidates()
        .map(([, type]: [unknown, string]) => type),
    );
    for (const { file, kind } of declared) {
      assert.ok(
        !bookshelfTypes.has(kind.resourceType),
        `${file} declares ${kind.resourceType}, which a Bookshelf model logs as`,
      );
    }
  });

  it('gives the Action model a read model for every kind logged through', function () {
    const actionLog = new ActionLog({ logging: createLoggingFake() });
    for (const { kind } of declared) {
      actionLog.for(kind);
    }

    const candidates: Array<[{ prototype: { tableName: string } }, string]> =
      models.Action.forge().resourceCandidates();
    for (const { kind } of declared) {
      const candidate = candidates.find(([, type]) => type === kind.resourceType);
      assert.ok(candidate, `no read model for ${kind.resourceType}`);
      assert.equal(candidate[0].prototype.tableName, kind.table);
    }
  });

  it('refuses a second declaration of a resource type pointing elsewhere', function () {
    const actionLog = new ActionLog({ logging: createLoggingFake() });
    const [{ kind }] = declared;
    actionLog.for(kind);

    assert.throws(() => actionLog.for({ ...kind, table: 'posts_meta' }), {
      errorType: 'IncorrectUsageError',
    });
    assert.ok(registeredKinds().some((registered) => registered === kind));
  });
});
