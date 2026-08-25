import JSZip from 'jszip';
import { inspectImportArchive } from './archive';

async function zipFile(name: string, build: (archive: JSZip) => void): Promise<File> {
  const archive = new JSZip();
  build(archive);
  const bytes = await archive.generateAsync({ type: 'arraybuffer' });
  return new File([bytes], name, { type: 'application/zip' });
}

describe('content import archive', () => {
  it('reads one root CSV without inflating asset files', async () => {
    const file = await zipFile('posts.zip', (archive) => {
      archive.file('posts.CSV', 'title\nHello');
      archive.file('content/images/large.jpg', new Uint8Array([1, 2, 3]));
      archive.file('content/files/attachment.csv', 'download,only');
    });

    await expect(inspectImportArchive(file)).resolves.toEqual({
      type: 'csv',
      csv: 'title\nHello',
      name: 'posts.CSV',
    });
  });

  it('reads one CSV inside a wrapper directory', async () => {
    const file = await zipFile('posts.zip', (archive) => {
      archive.file('export/posts.csv', 'title\nWrapped');
      archive.file('export/content/files/attachment.csv', 'download,only');
      archive.file('.DS_Store', 'metadata');
    });

    await expect(inspectImportArchive(file)).resolves.toMatchObject({
      type: 'csv',
      csv: 'title\nWrapped',
    });
  });

  it('allows an import-data directory name as the wrapper directory', async () => {
    const file = await zipFile('posts.zip', (archive) => {
      archive.file('content/posts.csv', 'title\nWrapped');
    });

    await expect(inspectImportArchive(file)).resolves.toMatchObject({
      type: 'csv',
      csv: 'title\nWrapped',
    });
  });

  it('leaves ZIPs without a data CSV on the legacy import path', async () => {
    const json = await zipFile('export.zip', (archive) => {
      archive.file('ghost-import.json', '{}');
      archive.file('content/files/attachment.csv', 'download,only');
    });

    await expect(inspectImportArchive(json)).resolves.toEqual({ type: 'legacy' });
  });

  it('rejects a data CSV nested below more than one wrapper directory', async () => {
    const file = await zipFile('posts.zip', (archive) => {
      archive.file('export/2024/posts.csv', 'title\nToo deep');
    });

    await expect(inspectImportArchive(file)).rejects.toThrow(
      'CSV files must be at the ZIP root or inside one wrapper directory',
    );
  });

  it('rejects multiple data CSV files', async () => {
    const file = await zipFile('posts.zip', (archive) => {
      archive.file('one.csv', 'title\nOne');
      archive.file('two.csv', 'title\nTwo');
    });

    await expect(inspectImportArchive(file)).rejects.toThrow('only one CSV file');
  });

  it('rejects CSV mixed with another import data format', async () => {
    const file = await zipFile('posts.zip', (archive) => {
      archive.file('posts.csv', 'title\nOne');
      archive.file('posts.json', '{}');
    });

    await expect(inspectImportArchive(file)).rejects.toThrow(
      'cannot contain CSV, JSON, or Markdown import files together',
    );
  });

  it('rejects content split between the root and a wrapper directory', async () => {
    const file = await zipFile('posts.zip', (archive) => {
      archive.file('export/posts.csv', 'title\nOne');
      archive.file('content/files/attachment.csv', 'download,only');
    });

    await expect(inspectImportArchive(file)).rejects.toThrow('Invalid ZIP file structure');
  });

  it('ignores macOS metadata entries', async () => {
    const file = await zipFile('posts.zip', (archive) => {
      archive.file('posts.csv', 'title\nOne');
      archive.file('__MACOSX/._posts.csv', 'metadata');
    });

    await expect(inspectImportArchive(file)).resolves.toMatchObject({ type: 'csv' });
  });

  it('rejects corrupt ZIP data with a stable error', async () => {
    const file = new File(['not a zip'], 'posts.zip', { type: 'application/zip' });

    await expect(inspectImportArchive(file)).rejects.toThrow('Unable to read ZIP file');
  });
});
