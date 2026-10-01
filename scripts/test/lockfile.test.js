import { describe, it } from 'node:test';
import assert from 'node:assert';

import { changedImporters, parseLockfile } from '../lib/lockfile.js';

// Two importers sharing `lib`, which depends on `debug`. Both debug versions
// stay in the lockfile throughout, so only the links between entries change.
function lockfile({ appReact = '17.0.2', libDebug = '4.4.3' } = {}) {
  return {
    importers: {
      '.': { devDependencies: { nx: { specifier: '23.2.0', version: '23.2.0' } } },
      'apps/app': {
        dependencies: {
          lib: { specifier: '1.0.0', version: '1.0.0' },
          react: { specifier: 'catalog:', version: appReact },
          shared: { specifier: 'workspace:*', version: 'link:../../packages/shared' },
        },
        devDependencies: {
          typescript: { specifier: 'catalog:', version: '@typescript/typescript6@6.0.2' },
        },
      },
      'apps/other': {
        dependencies: { react: { specifier: 'catalog:', version: '18.3.1' } },
      },
    },
    packages: {
      'nx@23.2.0': { resolution: { integrity: 'sha512-nx' } },
      'lib@1.0.0': { resolution: { integrity: 'sha512-lib' } },
      'debug@4.3.4': { resolution: { integrity: 'sha512-debug434' } },
      'debug@4.4.3': { resolution: { integrity: 'sha512-debug443' } },
      'react@17.0.2': { resolution: { integrity: 'sha512-react17' } },
      'react@18.3.1': { resolution: { integrity: 'sha512-react18' } },
      'supports-color@10.2.2': { resolution: { integrity: 'sha512-sc' } },
      '@typescript/typescript6@6.0.2': { resolution: { integrity: 'sha512-ts' } },
    },
    snapshots: {
      'nx@23.2.0': {},
      'lib@1.0.0': { dependencies: { debug: libDebug } },
      'debug@4.3.4': {},
      'debug@4.4.3(supports-color@10.2.2)': { dependencies: { 'supports-color': '10.2.2' } },
      'debug@4.4.3': {},
      'react@17.0.2': {},
      'react@18.3.1': {},
      'supports-color@10.2.2': {},
      '@typescript/typescript6@6.0.2': {},
    },
  };
}

describe('changedImporters', () => {
  it('reports nothing for identical lockfiles', () => {
    assert.deepStrictEqual(changedImporters(lockfile(), lockfile()), []);
  });

  it('catches an importer switching between versions already in the lockfile', () => {
    assert.deepStrictEqual(changedImporters(lockfile(), lockfile({ appReact: '18.3.1' })), [
      'apps/app',
    ]);
  });

  it('catches a direct dependency switching while both versions stay reachable', () => {
    // lib also reaches both react versions, so the set of snapshots apps/app
    // reaches is the same either way; only its own binding changes.
    const withBothReachable = (appReact) => {
      const lf = lockfile({ appReact });
      lf.snapshots['lib@1.0.0'].dependencies = {
        debug: '4.4.3',
        react: '17.0.2',
        'react-dom': '18.3.1',
      };
      lf.snapshots['react-dom@18.3.1'] = { dependencies: { react: '18.3.1' } };
      lf.packages['react-dom@18.3.1'] = { resolution: { integrity: 'sha512-reactdom' } };
      return lf;
    };

    assert.deepStrictEqual(
      changedImporters(withBothReachable('17.0.2'), withBothReachable('18.3.1')),
      ['apps/app'],
    );
  });

  it('catches a transitive link switching between versions already in the lockfile', () => {
    assert.deepStrictEqual(changedImporters(lockfile(), lockfile({ libDebug: '4.3.4' })), [
      'apps/app',
    ]);
  });

  it('follows peer-suffixed snapshot keys', () => {
    const base = lockfile({ libDebug: '4.4.3(supports-color@10.2.2)' });
    const head = lockfile({ libDebug: '4.4.3(supports-color@10.2.2)' });
    head.packages['supports-color@10.2.2'] = { resolution: { integrity: 'sha512-changed' } };

    assert.deepStrictEqual(changedImporters(base, head), ['apps/app']);
  });

  it('catches an integrity change with an unchanged version', () => {
    const head = lockfile();
    head.packages['react@18.3.1'] = { resolution: { integrity: 'sha512-repacked' } };

    assert.deepStrictEqual(changedImporters(lockfile(), head), ['apps/other']);
  });

  it('resolves npm aliases to the aliased package', () => {
    const head = lockfile();
    head.packages['@typescript/typescript6@6.0.2'] = { resolution: { integrity: 'sha512-new' } };

    assert.deepStrictEqual(changedImporters(lockfile(), head), ['apps/app']);
  });

  it('leaves workspace links to the project graph', () => {
    const head = lockfile();
    head.importers['apps/app'].dependencies.shared.version = 'link:../../packages/renamed';

    assert.deepStrictEqual(changedImporters(lockfile(), head), []);
  });

  it('reports new importers', () => {
    const head = lockfile();
    head.importers['apps/new'] = {
      dependencies: { react: { specifier: '18', version: '18.3.1' } },
    };

    assert.deepStrictEqual(changedImporters(lockfile(), head), ['apps/new']);
  });
});

describe('parseLockfile', () => {
  it('reads the workspace document after pnpm 12 packageManager document', () => {
    const text = [
      'lockfileVersion: "9.0"',
      'importers:',
      '  .:',
      '    packageManagerDependencies: {}',
      '---',
      'lockfileVersion: "9.0"',
      'importers:',
      '  apps/app: {}',
    ].join('\n');

    assert.deepStrictEqual(Object.keys(parseLockfile(text).importers), ['apps/app']);
  });
});
