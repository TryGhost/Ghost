import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { copyDirectorySkippingSelfReferences, emberAssetsPlugin } from '../vite-ember-assets';

import type {
  IndexHtmlTransformContext,
  MinimalPluginContextWithoutEnvironment,
  ResolvedConfig,
} from 'vite';

it('keeps the standalone canvas development harness free of Ember boot assets', () => {
  const read = vi
    .spyOn(fs, 'readFileSync')
    .mockReturnValue('<script src="assets/admin.js"></script>');
  try {
    const plugin = emberAssetsPlugin();
    const context = {} as MinimalPluginContextWithoutEnvironment;
    plugin.configResolved.call(context, {
      command: 'serve',
      root: '/admin',
      base: '/__admin-dev__',
    } as ResolvedConfig);
    expect(
      plugin.transformIndexHtml.handler.call(context, '', {
        filename: '/admin/canvas.html',
      } as IndexHtmlTransformContext),
    ).toEqual([]);
    expect(read).not.toHaveBeenCalled();
    expect(
      plugin.transformIndexHtml.handler.call(context, '', {
        filename: '/admin/index.html',
      } as IndexHtmlTransformContext),
    ).toEqual(expect.arrayContaining([expect.objectContaining({ tag: 'script' })]));
  } finally {
    read.mockRestore();
  }
});

describe('copyDirectorySkippingSelfReferences', () => {
  const temporaryDirectories: string[] = [];

  afterEach(() => {
    temporaryDirectories
      .splice(0)
      .forEach((directory) => fs.rmSync(directory, { recursive: true, force: true }));
  });

  it('copies ordinary assets without copying a symlink back onto the same real directory', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-admin-assets-'));
    temporaryDirectories.push(root);
    const shared = path.join(root, 'activitypub-dist');
    const source = path.join(root, 'react-assets');
    const destination = path.join(root, 'ghost-assets');
    fs.mkdirSync(shared);
    fs.mkdirSync(source);
    fs.mkdirSync(destination);
    fs.writeFileSync(path.join(shared, 'activitypub.js'), 'activitypub');
    fs.writeFileSync(path.join(source, 'admin.js'), 'admin');
    fs.symlinkSync(shared, path.join(source, 'activitypub'));
    fs.symlinkSync(shared, path.join(destination, 'activitypub'));

    copyDirectorySkippingSelfReferences(source, destination);

    expect(fs.readFileSync(path.join(destination, 'admin.js'), 'utf8')).toBe('admin');
    expect(fs.readFileSync(path.join(destination, 'activitypub', 'activitypub.js'), 'utf8')).toBe(
      'activitypub',
    );
  });
});
