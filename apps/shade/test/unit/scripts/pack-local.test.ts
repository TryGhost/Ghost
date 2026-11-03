/// <reference types="node" />
import { describe, expect, it } from 'vitest';
import { findTargetProblem, localVersion } from '../../../scripts/pack-local';

describe('localVersion', () => {
  const now = new Date(2026, 9, 21, 10, 12, 0);

  it('stamps the release with the local date and time', () => {
    expect(localVersion('0.1.0-alpha.0', now)).toBe('0.1.0-local.20261021-101200');
  });

  it('pads single-digit fields', () => {
    expect(localVersion('1.2.3', new Date(2027, 0, 2, 3, 4, 5))).toBe(
      '1.2.3-local.20270102-030405',
    );
  });

  it('drops build metadata', () => {
    expect(localVersion('2.0.0+sha.abc', now)).toBe('2.0.0-local.20261021-101200');
  });

  it('rejects a version without major.minor.patch', () => {
    expect(() => localVersion('private', now)).toThrow(/major\.minor\.patch/);
  });
});

describe('findTargetProblem', () => {
  const app = '/apps/demo';
  const dependsOnShade = JSON.stringify({ dependencies: { '@tryghost/shade': '^0.1.0-alpha.5' } });

  it('accepts an npm app that depends on Shade', () => {
    expect(
      findTargetProblem(app, dependsOnShade, ['package.json', 'package-lock.json']),
    ).toBeUndefined();
  });

  it('accepts Shade as a dev dependency', () => {
    const manifest = JSON.stringify({ devDependencies: { '@tryghost/shade': 'alpha' } });
    expect(findTargetProblem(app, manifest, ['package.json', 'package-lock.json'])).toBeUndefined();
  });

  it('needs a package.json', () => {
    expect(findTargetProblem(app, undefined, [])).toMatch(/has no package\.json/);
  });

  it('needs valid JSON', () => {
    expect(findTargetProblem(app, '{', ['package.json', 'package-lock.json'])).toMatch(
      /isn't valid JSON/,
    );
  });

  it('needs a dependency on Shade', () => {
    const manifest = JSON.stringify({ dependencies: { react: '^18.3.1' } });
    expect(findTargetProblem(app, manifest, ['package.json', 'package-lock.json'])).toMatch(
      /doesn't depend on @tryghost\/shade/,
    );
  });

  it.each([
    ['pnpm-lock.yaml', 'pnpm'],
    ['yarn.lock', 'Yarn'],
    ['bun.lock', 'Bun'],
  ])('says only npm is supported for %s', (lockfile, manager) => {
    const problem = findTargetProblem(app, dependsOnShade, ['package.json', lockfile]);
    expect(problem).toContain(`uses ${manager}`);
    expect(problem).toContain('Only npm apps are supported so far');
  });

  it('needs a package-lock.json', () => {
    expect(findTargetProblem(app, dependsOnShade, ['package.json'])).toMatch(
      /has no package-lock\.json/,
    );
  });
});
