import { execFileSync } from 'node:child_process';
import { describe, it, expect } from 'vitest';
import {
  UpgradeBase,
  UpgradeAdapterError,
  type AcceptedUpgradeJob,
  type UpgradeJobResult,
  type UpgradeStatus,
} from '../src/index.ts';

class HostAdapter extends UpgradeBase {
  async getStatus(): Promise<UpgradeStatus> {
    return { supported: false, reason: 'not-configured' };
  }

  async createRequest(): Promise<AcceptedUpgradeJob> {
    return {
      id: 'f76543a0-c052-45e8-b020-03c86a809b93',
      targetVersion: '7.0.0',
      state: 'queued',
      createdAt: '2026-09-29T12:00:00.000Z',
      updatedAt: '2026-09-29T12:00:00.000Z',
    };
  }

  async getJob(id: string): Promise<UpgradeJobResult> {
    return { id, state: 'unknown' };
  }
}

describe('UpgradeBase', () => {
  it('supports optional configuration and an immutable method contract', async () => {
    const adapter = new HostAdapter({});
    expect(adapter.requiredFns).toEqual(['getStatus', 'createRequest', 'getJob']);
    expect(Object.isFrozen(adapter.requiredFns)).toBe(true);
    expect(Object.getOwnPropertyDescriptor(adapter, 'requiredFns')?.writable).toBe(false);
    expect(await new HostAdapter().getStatus()).toEqual({
      supported: false,
      reason: 'not-configured',
    });
  });
});

it('loads the compiled ESM package through the production CommonJS entry point', () => {
  const script = `
    const assert = require('node:assert/strict');
    const {createRequire} = require('node:module');
    const load = createRequire(process.cwd() + '/package.json');
    const {UpgradeBase} = load('@tryghost/adapter-base-upgrade');
    assert.match(load.resolve('@tryghost/adapter-base-upgrade'), /build[/\\\\]index.js$/);
    class ExternalAdapter extends UpgradeBase {}
    assert.deepEqual(new ExternalAdapter().requiredFns, ['getStatus', 'createRequest', 'getJob']);
  `;
  execFileSync(process.execPath, ['-e', script], { env: { ...process.env, NODE_OPTIONS: '' } });
});

it('carries deliberate public diagnostics independently of exception text', () => {
  const diagnostics = [
    {
      source: 'gscan',
      code: 'GS001',
      severity: 'warning' as const,
      message: 'Replace the deprecated helper.',
    },
  ];
  const error = new UpgradeAdapterError({ code: 'checks-failed', diagnostics });
  expect(error).toBeInstanceOf(Error);
  expect(error.name).toBe('UpgradeAdapterError');
  expect(error.code).toBe('checks-failed');
  expect(error.diagnostics).toEqual(diagnostics);
  expect(new UpgradeAdapterError({ code: 'busy' }).diagnostics).toBeUndefined();
});
