import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import sinon from 'sinon';

const ImportArchive = require('../../../core/server/data/importer/import-archive').default;
const importManager = require('../../../core/server/data/importer/import-manager');

describe('ImportArchive', function () {
  let directory: string;

  beforeEach(async function () {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'import-archive-test-'));
  });

  afterEach(async function () {
    sinon.restore();
    await fs.remove(directory);
  });

  function archive(options: { extensions?: string[]; directories?: string[] } = {}) {
    return new ImportArchive({
      extensions: options.extensions ?? ['.json'],
      directories: options.directories ?? [],
    });
  }

  async function write(fileName: string, contents = ''): Promise<void> {
    const filePath = path.join(directory, fileName);
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, contents);
  }

  it('keeps the legacy import manager archive methods on the shared helper', function () {
    const getGlobPattern = sinon.stub(importManager.archive, 'getGlobPattern').returns('glob');
    const getExtensionGlob = sinon
      .stub(importManager.archive, 'getExtensionGlob')
      .returns('extension glob');
    const getDirectoryGlob = sinon
      .stub(importManager.archive, 'getDirectoryGlob')
      .returns('directory glob');
    const isValid = sinon.stub(importManager.archive, 'isValid').returns(true);
    const getFiles = sinon
      .stub(importManager.archive, 'getFiles')
      .returns([{ name: 'posts.json' }]);
    const getBaseDirectory = sinon
      .stub(importManager.archive, 'getBaseDirectory')
      .returns('export');

    assert.equal(importManager.getGlobPattern(['.json']), 'glob');
    assert.equal(importManager.getExtensionGlob(['.json'], 1), 'extension glob');
    assert.equal(importManager.getDirectoryGlob(['content'], 2), 'directory glob');
    assert.equal(importManager.isValidZip('/tmp/export'), true);
    assert.deepEqual(importManager.getFilesFromZip({ extensions: ['.json'] }, '/tmp/export'), [
      { name: 'posts.json' },
    ]);
    assert.equal(importManager.getBaseDirectory('/tmp/export'), 'export');

    sinon.assert.calledOnceWithExactly(getGlobPattern, ['.json']);
    sinon.assert.calledOnceWithExactly(getExtensionGlob, ['.json'], 1);
    sinon.assert.calledOnceWithExactly(getDirectoryGlob, ['content'], 2);
    sinon.assert.calledOnceWithExactly(isValid, '/tmp/export');
    sinon.assert.calledOnceWithExactly(getFiles, '/tmp/export', ['.json']);
    sinon.assert.calledOnceWithExactly(getBaseDirectory, '/tmp/export');
  });

  it('builds extension and directory globs for each supported depth', function () {
    const subject = archive();

    assert.equal(subject.getGlobPattern(['.json', '.md']), '+(.json|.md)');
    assert.equal(subject.getExtensionGlob(['.json']), '*+(.json)');
    assert.equal(subject.getExtensionGlob(['.json'], 1), '{*/*,*}+(.json)');
    assert.equal(subject.getExtensionGlob(['.json'], 2), '**/*+(.json)');
    assert.equal(subject.getDirectoryGlob(['content']), '+(content)');
    assert.equal(subject.getDirectoryGlob(['content'], 1), '{*/,}+(content)');
    assert.equal(subject.getDirectoryGlob(['content'], 2), '**/+(content)');
  });

  it('accepts data at the root or in one wrapper directory', async function () {
    const subject = archive();

    await write('POSTS.JSON');
    assert.equal(subject.isValid(directory), true);

    await fs.emptyDir(directory);
    await write('export/posts.json');
    assert.equal(subject.isValid(directory), true);
  });

  it('accepts deeply nested data when a supported directory is present', async function () {
    const subject = archive({ directories: ['content'] });

    await write('export/content/images/photo.jpg');
    await write('export/data/posts.json');

    assert.equal(subject.isValid(directory), true);
  });

  it('rejects archives without importable content', async function () {
    await write('readme.txt');

    assert.throws(() => archive().isValid(directory), /did not include any content/);
  });

  it('rejects data nested more deeply than the supported structure', async function () {
    await write('export/data/posts.json');

    assert.throws(() => archive().isValid(directory), /Invalid zip file structure/);
  });

  it('finds the base directory and handles root data and content directories', async function () {
    const subject = archive({ directories: ['content'] });

    await write('export/posts.json');
    assert.equal(subject.getBaseDirectory(directory), 'export');

    await fs.emptyDir(directory);
    await write('posts.json');
    assert.equal(subject.getBaseDirectory(directory), undefined);

    await fs.emptyDir(directory);
    await fs.ensureDir(path.join(directory, 'content'));
    assert.equal(subject.getBaseDirectory(directory), undefined);
  });

  it('rejects reading a base directory when there are no data files', function () {
    assert.throws(() => archive().getBaseDirectory(directory), /base directory read failed/);
  });

  it('returns case-insensitive file matches with absolute paths', async function () {
    await write('export/POSTS.JSON');

    assert.deepEqual(archive().getFiles(directory, ['.json']), [
      {
        name: 'export/POSTS.JSON',
        path: path.join(directory, 'export/POSTS.JSON'),
      },
    ]);
  });

  it('extracts files and normalizes their permissions', async function () {
    const subject = new ImportArchive(
      { extensions: ['.json'], directories: [] },
      {
        extract: async (_filePath: string, target: string) => {
          await fs.outputFile(path.join(target, 'export/posts.json'), '{}');
          await fs.chmod(path.join(target, 'export/posts.json'), 0o600);
        },
      },
    );

    const extracted = await subject.extract('/tmp/posts.zip');
    try {
      const mode = (await fs.stat(path.join(extracted, 'export/posts.json'))).mode & 0o777;
      assert.equal(mode, 0o644);
    } finally {
      await fs.remove(extracted);
    }
  });

  it('reports invalid filename encoding and removes partial extraction', async function () {
    let extracted = '';
    const subject = new ImportArchive(
      { extensions: ['.json'], directories: [] },
      {
        extract: async (_filePath: string, target: string) => {
          extracted = target;
          await fs.outputFile(path.join(target, 'partial.json'), '{}');
          throw new Error('ENAMETOOLONG: invalid filename');
        },
      },
    );

    await assert.rejects(
      subject.extract('/tmp/posts.zip'),
      (error: { code?: string; message?: string; context?: string }) => {
        assert.equal(error.code, 'INVALID_ZIP_FILE_NAME_ENCODING');
        assert.match(error.message ?? '', /could not be read/);
        assert.match(error.context ?? '', /filename was too long/);
        return true;
      },
    );
    assert.equal(await fs.pathExists(extracted), false);
  });

  for (const message of [
    'end of central directory record signature not found',
    'invalid comment length',
  ]) {
    it(`reports a malformed ZIP for ${message}`, async function () {
      const subject = new ImportArchive(
        { extensions: ['.json'], directories: [] },
        {
          extract: async () => {
            throw new Error(message);
          },
        },
      );

      await assert.rejects(subject.extract('/tmp/posts.zip'), (error: { code?: string }) => {
        assert.equal(error.code, 'INVALID_ZIP_FILE');
        return true;
      });
    });
  }

  it('preserves unexpected extraction errors', async function () {
    const unexpected = new Error('unexpected extraction error');
    const subject = new ImportArchive(
      { extensions: ['.json'], directories: [] },
      {
        extract: async () => {
          throw unexpected;
        },
      },
    );

    await assert.rejects(subject.extract('/tmp/posts.zip'), (error: unknown) => {
      return error === unexpected;
    });
  });
});
