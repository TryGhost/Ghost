import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  checkDuplicateDependencies,
  collectLoadedFiles,
  formatDuplicateReport,
  parsePackageFromPath,
} from '../../../bin/lib/duplicate-deps';

// The fixture lives outside the project, so the runner leaves this import to Node
// and the file loads the way an ESM adapter would.
const nativeImport = (specifier: string) => import(/* @vite-ignore */ specifier);

/** Write a package, returning the file path a `require()` of it would cache. */
function writePackage(nodeModules: string, name: string, version: string): string {
  const packagePath = path.join(nodeModules, ...name.split('/'));
  fs.mkdirSync(packagePath, { recursive: true });
  fs.writeFileSync(path.join(packagePath, 'package.json'), JSON.stringify({ name, version }));
  fs.writeFileSync(path.join(packagePath, 'index.js'), 'module.exports = {};\n');

  return path.join(packagePath, 'index.js');
}

/**
 * The same in pnpm's isolated layout, how Ghost's own dependencies are installed:
 * the files live in the virtual store and the root name is only a symlink to them.
 */
function writePnpmPackage(nodeModules: string, name: string, version: string): string {
  const storeDirName = `${name.replace('/', '+')}@${version}`;
  const store = path.join(nodeModules, '.pnpm', storeDirName, 'node_modules');
  const indexPath = writePackage(store, name, version);

  const linkPath = path.join(nodeModules, ...name.split('/'));
  fs.mkdirSync(path.dirname(linkPath), { recursive: true });
  fs.symlinkSync(path.dirname(indexPath), linkPath, 'dir');

  return indexPath;
}

describe('bin/lib/duplicate-deps', function () {
  describe('parsePackageFromPath', function () {
    it('attributes a file to the package directory that contains it', function () {
      assert.deepEqual(
        parsePackageFromPath('/home/ghost/adapters/storage/S3Storage/node_modules/lodash/index.js'),
        {
          name: 'lodash',
          path: '/home/ghost/adapters/storage/S3Storage/node_modules/lodash',
        },
      );
    });

    it("reads a scoped package out of pnpm's store layout, peer suffix and all", function () {
      // The store directory name is never parsed, so pnpm's encoding of the scope
      // (`+`) and of peer dependencies (`_`) doesn't have to be understood.
      assert.deepEqual(
        parsePackageFromPath(
          '/home/ghost/node_modules/.pnpm/@tryghost+metrics@1.0.3_pg@8.11.0/node_modules/@tryghost/metrics/lib/index.js',
        ),
        {
          name: '@tryghost/metrics',
          path: '/home/ghost/node_modules/.pnpm/@tryghost+metrics@1.0.3_pg@8.11.0/node_modules/@tryghost/metrics',
        },
      );
    });

    it('attributes a nested dependency to the package that physically contains it', function () {
      assert.deepEqual(
        parsePackageFromPath(
          '/home/ghost/node_modules/.pnpm/outer@1.0.0/node_modules/outer/node_modules/inner/index.js',
        ),
        {
          name: 'inner',
          path: '/home/ghost/node_modules/.pnpm/outer@1.0.0/node_modules/outer/node_modules/inner',
        },
      );
    });

    it('returns null for a file that is not inside a package', function () {
      assert.equal(parsePackageFromPath('/home/ghost/current/core/server/boot.js'), null);
      assert.equal(parsePackageFromPath('/home/ghost/adapters/storage/S3Storage/index.js'), null);
    });

    it("returns null for an installer's own directories, which are not packages", function () {
      // npm forbids a leading dot in a package name, so the whole class of them
      // goes without enumerating each installer's layout.
      assert.equal(parsePackageFromPath('/home/ghost/node_modules/.pnpm/lock.yaml'), null);
      assert.equal(parsePackageFromPath('/home/ghost/node_modules/.bin/knex-migrator'), null);
    });
  });

  describe('collectLoadedFiles', function () {
    it('keeps the CommonJS cache it is given, without duplicating entries', function () {
      const files = collectLoadedFiles([
        '/home/ghost/a.js',
        '/home/ghost/a.js',
        '/home/ghost/b.js',
      ]);

      assert.deepEqual(
        files.filter((file) => file.startsWith('/home/ghost/')),
        ['/home/ghost/a.js', '/home/ghost/b.js'],
      );
    });

    it('sees an ESM module, which the CommonJS cache never contains', async function () {
      const tmpDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-esm-deps-')));
      const modulePath = path.join(tmpDir, 'adapter.mjs');
      fs.writeFileSync(modulePath, 'export const loaded = true;\n');

      try {
        await nativeImport(pathToFileURL(modulePath).href);

        assert.ok(
          collectLoadedFiles([]).includes(modulePath),
          'expected the imported ESM file to be reported as loaded',
        );
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });

  describe('checkDuplicateDependencies', function () {
    let tmpDir: string;
    let ghostNodeModules: string;
    let adapterRoot: string;
    let adapterNodeModules: string;

    // Two trees, the way Ghost Pro installs them: Ghost's dependencies in pnpm's
    // isolated layout, and a self-contained adapter directory beside them.
    beforeEach(function () {
      tmpDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-duplicate-deps-')));
      ghostNodeModules = path.join(tmpDir, 'ghost', 'node_modules');
      adapterRoot = path.join(tmpDir, 'adapters');
      adapterNodeModules = path.join(adapterRoot, 'storage', 'S3Storage', 'node_modules');
      fs.mkdirSync(ghostNodeModules, { recursive: true });
      fs.mkdirSync(adapterNodeModules, { recursive: true });
    });

    afterEach(function () {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    function check(cachedFiles: string[], mustBeSingleCopy: string[] = ['ghost-storage-base']) {
      return checkDuplicateDependencies({
        cachedFiles,
        adapterRoots: [adapterRoot],
        ghostNodeModulesRoots: [ghostNodeModules],
        mustBeSingleCopy,
      });
    }

    it("reports nothing when the adapter shares Ghost's copy of every package", function () {
      const sharedBase = writePnpmPackage(ghostNodeModules, 'ghost-storage-base', '1.1.0');
      const sharedLodash = writePnpmPackage(ghostNodeModules, 'lodash', '4.17.20');
      const adapterOwn = writePackage(adapterNodeModules, 'aws-sdk', '2.1.0');

      const report = check([sharedBase, sharedLodash, adapterOwn]);

      assert.deepEqual(report.duplicates, []);
      assert.deepEqual(report.blocking, []);
    });

    it('reports a package the adapter brought its own copy of, without blocking', function () {
      const ghostLodash = writePnpmPackage(ghostNodeModules, 'lodash', '4.17.20');
      const adapterLodash = writePackage(adapterNodeModules, 'lodash', '4.17.21');

      const report = check([ghostLodash, adapterLodash]);

      assert.deepEqual(report.duplicates, [
        {
          name: 'lodash',
          adapter: { version: '4.17.21', path: path.join(adapterNodeModules, 'lodash') },
          ghost: { version: '4.17.20', path: path.dirname(ghostLodash) },
        },
      ]);
      assert.deepEqual(report.blocking, []);
    });

    it('blocks on a duplicate of a package that must be a single copy', function () {
      const ghostBase = writePnpmPackage(ghostNodeModules, 'ghost-storage-base', '1.1.0');
      const adapterBase = writePackage(adapterNodeModules, 'ghost-storage-base', '1.1.0');
      const adapterLodash = writePackage(adapterNodeModules, 'lodash', '4.17.21');
      const ghostLodash = writePnpmPackage(ghostNodeModules, 'lodash', '4.17.20');

      const report = check([ghostBase, adapterBase, ghostLodash, adapterLodash]);

      // Name order, and the identical version still counts: two copies of the
      // base class are still two function objects.
      assert.deepEqual(
        report.duplicates.map(({ name }) => name),
        ['ghost-storage-base', 'lodash'],
      );
      assert.deepEqual(
        report.blocking.map(({ name }) => name),
        ['ghost-storage-base'],
      );
      assert.equal(
        report.blocking[0].adapter.path,
        path.join(adapterNodeModules, 'ghost-storage-base'),
      );
      assert.equal(report.blocking[0].ghost.path, path.dirname(ghostBase));
    });

    it('resolves symlinks before deciding which tree a file came from', function () {
      // Ghost caches pnpm's store path, but an adapter requiring the same copy
      // through the root symlink could surface the link path instead.
      const ghostLodash = writePnpmPackage(ghostNodeModules, 'lodash', '4.17.20');
      const throughSymlink = path.join(ghostNodeModules, 'lodash', 'index.js');

      const report = check([throughSymlink]);

      assert.deepEqual(report.duplicates, []);
      assert.equal(
        parsePackageFromPath(fs.realpathSync(throughSymlink))?.path,
        path.dirname(ghostLodash),
      );
    });

    it("treats an adapter installed inside the Ghost directory as the adapter's tree", function () {
      // content/adapters lives inside the installation, so the two aren't
      // mutually exclusive - the adapter has to win.
      const contentAdapters = path.join(tmpDir, 'ghost', 'content', 'adapters');
      const contentAdapterNodeModules = path.join(
        contentAdapters,
        'cache',
        'Redis',
        'node_modules',
      );
      fs.mkdirSync(contentAdapterNodeModules, { recursive: true });

      const ghostIoredis = writePnpmPackage(ghostNodeModules, 'ioredis', '5.3.0');
      const adapterIoredis = writePackage(contentAdapterNodeModules, 'ioredis', '5.4.0');

      const report = checkDuplicateDependencies({
        cachedFiles: [ghostIoredis, adapterIoredis],
        adapterRoots: [contentAdapters],
        ghostNodeModulesRoots: [ghostNodeModules],
        mustBeSingleCopy: [],
      });

      assert.equal(report.duplicates.length, 1);
      assert.equal(report.duplicates[0].adapter.version, '5.4.0');
      assert.equal(report.duplicates[0].ghost.version, '5.3.0');
    });

    it('reports a copy whose manifest cannot be read as an unknown version', function () {
      const ghostLodash = writePnpmPackage(ghostNodeModules, 'lodash', '4.17.20');
      const adapterLodash = path.join(adapterNodeModules, 'lodash', 'index.js');
      fs.mkdirSync(path.dirname(adapterLodash), { recursive: true });
      fs.writeFileSync(adapterLodash, 'module.exports = {};\n');

      const report = check([ghostLodash, adapterLodash]);

      assert.equal(report.duplicates.length, 1);
      assert.equal(report.duplicates[0].adapter.version, 'unknown');
      assert.equal(report.duplicates[0].ghost.version, '4.17.20');
    });

    it('ignores adapter paths that do not exist', function () {
      const ghostLodash = writePnpmPackage(ghostNodeModules, 'lodash', '4.17.20');

      const report = checkDuplicateDependencies({
        cachedFiles: [ghostLodash],
        adapterRoots: [path.join(tmpDir, 'nope'), adapterRoot],
        ghostNodeModulesRoots: [ghostNodeModules],
        mustBeSingleCopy: [],
      });

      assert.deepEqual(report.duplicates, []);
    });
  });

  describe('formatDuplicateReport', function () {
    const duplicate = {
      name: 'ghost-storage-base',
      adapter: {
        version: '1.1.0',
        path: '/home/ghost/adapters/storage/S3Storage/node_modules/ghost-storage-base',
      },
      ghost: { version: '1.1.1', path: '/home/ghost/node_modules/ghost-storage-base' },
    };

    it('says so when there is nothing to report', function () {
      const output = formatDuplicateReport({ duplicates: [], blocking: [] });

      assert.match(output, /^ {2}ok {4}no duplicate dependencies\n$/);
    });

    it('names both copies, and passes when none of them must be a single copy', function () {
      const output = formatDuplicateReport({ duplicates: [duplicate], blocking: [] });

      assert.match(output, /1 package\(s\) loaded from both an adapter and Ghost/);
      assert.match(output, /adapter 1\.1\.0 {2}\/home\/ghost\/adapters/);
      assert.match(output, /ghost {3}1\.1\.1 {2}\/home\/ghost\/node_modules/);
      assert.ok(!output.includes('FAIL'));
    });

    it('marks a blocking duplicate as a failure', function () {
      const output = formatDuplicateReport({ duplicates: [duplicate], blocking: [duplicate] });

      assert.match(output, / {2}FAIL {2}duplicate dependencies: ghost-storage-base\n/);
    });
  });
});
