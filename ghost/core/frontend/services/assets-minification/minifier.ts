/**
 * ```
 * const { Minifier } = require('./minifier');
 * const minifier = new Minifier({
 *     src: 'my/src/path',
 *     dest: 'my/dest/path'
 * });
 *
 * minifier.minify({
 *     'some.css': '*.css',
 *     'then.js': '!(other).js'
 * });
 * ```
 *
 * - Minfier constructor requires a src and a dest
 * - minify() function takes an object with destination file as the key and source glob as the value
 *    - globs can be anything fs.glob supports
 *    - destination files must end with .css or .js
 *    - src files will be minified according to their destination file extension
 */

import errors from '@tryghost/errors';
import createDebug from '@tryghost/debug';
import tpl from '@tryghost/tpl';
import path from 'node:path';
import fs from 'node:fs/promises';

const debug = createDebug('minifier');

const messages = {
  badDestination: {
    message: 'Unexpected destination {dest}',
    context: 'Minifier expected a destination that ended in .css or .js',
  },
  badSource: {
    message: 'Unable to read source files {src}',
    context: 'Minifier was unable to locate or read the source files',
  },
  missingConstructorOption: {
    message: 'Minifier missing {opt} option',
    context: 'new Minifier({}) requires a {opt} option',
  },
  globalHelp: 'Refer to the README for Minifier for how to use this module',
};

type MinifyOptions = {
  /** Key value pairs that should get replaced in the content before minifying */
  replacements?: Record<string, string>;
};

// public API for minify hooks
export class Minifier {
  srcPath: string;
  destPath: string;

  constructor({ src, dest }: { src?: string; dest?: string } = {}) {
    if (!src) {
      throw new errors.IncorrectUsageError({
        message: tpl(messages.missingConstructorOption.message, { opt: 'src' }),
        context: tpl(messages.missingConstructorOption.context, { opt: 'src' }),
        help: tpl(messages.globalHelp),
      });
    }
    if (!dest) {
      throw new errors.IncorrectUsageError({
        message: tpl(messages.missingConstructorOption.message, { opt: 'dest' }),
        context: tpl(messages.missingConstructorOption.context, { opt: 'dest' }),
        help: tpl(messages.globalHelp),
      });
    }
    this.srcPath = src;
    this.destPath = dest;
  }

  getFullSrc(src: string): string {
    return path.join(this.srcPath, src);
  }

  getFullDest(dest: string): string {
    return path.join(this.destPath, dest);
  }

  async minifyCSS(contents: string): Promise<string | null> {
    const csso: typeof import('csso') = require('csso');
    const result = csso.minify(contents);
    if (result && result.css) {
      return result.css;
    }
    return null;
  }

  async minifyJS(contents: string): Promise<string | null> {
    const terser: typeof import('terser') = require('terser');
    const result = await terser.minify(contents);
    if (result && result.code) {
      return result.code;
    }
    return null;
  }

  async getMatchingFiles(src: string): Promise<string[]> {
    const files: string[] = [];
    for await (const file of fs.glob(this.getFullSrc(src))) {
      files.push(file);
    }
    // Files are concatenated in this order, so keep it deterministic
    return files.sort();
  }

  async readFiles(files: string[]): Promise<string> {
    let mergedFiles = '';
    for (const file of files) {
      const contents = await fs.readFile(file, 'utf8');
      mergedFiles += contents;
    }

    return mergedFiles;
  }

  async getSrcFileContents(src: string): Promise<string> {
    const badSource = new errors.IncorrectUsageError({
      message: tpl(messages.badSource.message, { src }),
      context: tpl(messages.badSource.context),
      help: tpl(messages.globalHelp),
    });

    let files: string[];
    try {
      files = await this.getMatchingFiles(src);
    } catch {
      throw badSource;
    }

    // fs.glob returns nothing for missing files and folders
    if (!files.length) {
      throw badSource;
    }

    try {
      return await this.readFiles(files);
    } catch {
      throw badSource;
    }
  }

  async writeFile(contents: string | null, dest: string): Promise<string | undefined> {
    if (contents) {
      const writePath = this.getFullDest(dest);
      // Ensure the output folder exists
      await fs.mkdir(this.destPath, { recursive: true });
      // Create the file
      await fs.writeFile(writePath, contents);
      return writePath;
    }
  }

  /**
   * Minify files
   *
   * @param globs An object in the form of
   * ```js
   * {
   *     'destination1.js': 'glob/*.js',
   *     'destination2.js': 'glob2/*.js'
   * }
   * ```
   * @returns List of minified files (keys of globs)
   */
  async minify(globs: Record<string, string>, options?: MinifyOptions): Promise<string[]> {
    debug('Begin', globs);
    const destinations = Object.keys(globs);
    const minifiedFiles: string[] = [];

    for (const dest of destinations) {
      const isCSS = dest.endsWith('.css');
      if (!isCSS && !dest.endsWith('.js')) {
        throw new errors.IncorrectUsageError({
          message: tpl(messages.badDestination.message, { dest }),
          context: tpl(messages.badDestination.context),
          help: tpl(messages.globalHelp),
        });
      }

      const src = globs[dest];
      let contents = await this.getSrcFileContents(src);

      if (options?.replacements) {
        for (const key of Object.keys(options.replacements)) {
          contents = contents.replace(key, options.replacements[key]);
        }
      }

      const minifiedContents = isCSS
        ? await this.minifyCSS(contents)
        : await this.minifyJS(contents);

      const result = await this.writeFile(minifiedContents, dest);
      if (result) {
        minifiedFiles.push(dest);
      }
    }

    debug('End');
    return minifiedFiles;
  }
}
