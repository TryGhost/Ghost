import { describe, it, expect } from 'vitest';
import {
  upgradeStatusSchema,
  upgradeJobResultSchema,
  acceptedUpgradeJobSchema,
  createUpgradeRequestSchema,
  upgradeDiagnosticSchema,
  upgradeJobIdSchema,
} from '../src/index.ts';

const id = 'f76543a0-c052-45e8-b020-03c86a809b93';
const status = {
  supported: true,
  availability: 'ready',
  currentVersion: '6.64.0',
  targets: [{ version: '7.0.0' }],
  backupRequired: true,
  activeJobId: null,
  pollAfterMs: 5000,
};

const diagnostic = {
  source: 'gscan',
  code: 'GS001',
  severity: 'error',
  message: 'The active theme uses an unsupported helper.',
  details: 'Replace the helper in the listed template before updating to Ghost 7.',
  help: 'https://example.com/theme-compatibility',
  locations: [{ file: 'partials/post.hbs', line: 12 }],
};

describe('upgrade domain schemas', () => {
  it('accepts major targets without Docker images or a transport heartbeat', () => {
    expect(upgradeStatusSchema.parse(status)).toEqual(status);
    expect(
      upgradeStatusSchema.parse({
        ...status,
        targets: Array.from({ length: 25 }, () => ({ version: '7.0.0' })),
      }).supported,
    ).toBe(true);
  });

  it('preserves host release identifiers across status, requests and accepted jobs', () => {
    for (const version of [
      '7.0.0-rc.1',
      '6.65.0-nightly.20260929+abcdef',
      'nightly-2026-09-29',
      'nightly',
    ]) {
      const discovery = { ...status, currentVersion: version, targets: [{ version }] };
      expect(upgradeStatusSchema.parse(discovery)).toEqual(discovery);
      const request = { targetVersion: version, idempotencyKey: 'a'.repeat(64) };
      expect(createUpgradeRequestSchema.parse(request)).toEqual(request);
      const job = {
        id,
        targetVersion: version,
        state: 'queued',
        createdAt: '2026-09-29T12:00:00.000Z',
        updatedAt: '2026-09-29T12:00:00.000Z',
      };
      expect(acceptedUpgradeJobSchema.parse(job)).toEqual(job);
    }
    for (const targetVersion of ['', 'x'.repeat(129), 123, null]) {
      expect(
        createUpgradeRequestSchema.safeParse({ targetVersion, idempotencyKey: 'a'.repeat(64) })
          .success,
      ).toBe(false);
    }
  });

  it('requires canonical lowercase UUID v4 IDs without normalizing invalid inputs', () => {
    expect(upgradeJobIdSchema.parse(id)).toBe(id);
    for (const value of [
      id.toUpperCase(),
      id.replace('-45e8-', '-75e8-'),
      '00000000-0000-0000-0000-000000000000',
      '../job',
    ]) {
      expect(upgradeJobIdSchema.safeParse(value).success).toBe(false);
    }
  });

  it('distinguishes capability from busy, unavailable and blocked hosts', () => {
    for (const availability of ['busy', 'unavailable', 'blocked']) {
      expect(
        upgradeStatusSchema.parse({ supported: true, availability, backupRequired: true }),
      ).toEqual({ supported: true, availability, backupRequired: true });
    }
    expect(upgradeStatusSchema.parse({ supported: false, reason: 'not-configured' })).toEqual({
      supported: false,
      reason: 'not-configured',
    });
    expect(
      upgradeStatusSchema.safeParse({ supported: false, reason: '/private/password' }).success,
    ).toBe(false);
  });

  it('rejects incomplete ready hosts, unsafe checkpoints and invalid poll intervals', () => {
    for (const value of [
      { supported: true, availability: 'ready', backupRequired: true },
      { ...status, backupRequired: false },
      { ...status, currentVersion: '' },
      { ...status, activeJobId: '../job' },
      { ...status, pollAfterMs: 0 },
      { ...status, pollAfterMs: 60001 },
    ]) {
      expect(upgradeStatusSchema.safeParse(value).success).toBe(false);
    }
  });

  it('requires a target and timestamps in accepted jobs while allowing partial lookup records', () => {
    const job = {
      id,
      targetVersion: '7.0.0',
      state: 'queued',
      createdAt: '2026-09-29T12:00:00.000Z',
      updatedAt: '2026-09-29T12:00:00.000Z',
    };
    expect(acceptedUpgradeJobSchema.parse(job)).toEqual(job);
    expect(acceptedUpgradeJobSchema.safeParse({ id, state: 'queued' }).success).toBe(false);
    for (const state of [
      'checking',
      'blocked',
      'queued',
      'rolled-back',
      'recovery-required',
      'unknown',
      'expired',
    ]) {
      expect(upgradeJobResultSchema.parse({ id, state }).state).toBe(state);
    }
    expect(upgradeJobResultSchema.safeParse({ id, state: 'invalid' }).success).toBe(false);
  });

  it('accepts descriptive errors and warnings while stripping raw exception fields', () => {
    for (const severity of ['error', 'warning']) {
      expect(
        upgradeDiagnosticSchema.parse({
          ...diagnostic,
          severity,
          stack: 'private',
          token: 'secret',
        }),
      ).toEqual({ ...diagnostic, severity });
    }
    for (const value of [
      { ...diagnostic, locations: [{ file: '/private/theme.hbs' }] },
      { ...diagnostic, locations: [{ file: '../theme.hbs' }] },
      { ...diagnostic, locations: [{ file: 'C:\\private\\theme.hbs' }] },
      { ...diagnostic, help: 'javascript:alert(1)' },
      { ...diagnostic, help: 'http://example.com/theme-compatibility' },
      { ...diagnostic, message: 'x'.repeat(2049) },
    ]) {
      expect(upgradeDiagnosticSchema.safeParse(value).success).toBe(false);
    }
  });

  it('requires a scoped intent key and rejects additional execution controls', () => {
    const request = { targetVersion: '7.0.0', idempotencyKey: 'a'.repeat(64) };
    expect(createUpgradeRequestSchema.parse(request)).toEqual(request);
    expect(createUpgradeRequestSchema.safeParse({ ...request, skipBackup: true }).success).toBe(
      false,
    );
    for (const idempotencyKey of [
      id,
      'A'.repeat(64),
      'a'.repeat(63),
      'a'.repeat(65),
      'g'.repeat(64),
    ]) {
      expect(createUpgradeRequestSchema.safeParse({ ...request, idempotencyKey }).success).toBe(
        false,
      );
    }
  });
});
