import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { globSync } from 'glob';

const { extract } = require('@tryghost/zip') as {
  extract(filePath: string, directory: string): Promise<void>;
};
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');

const messages = {
  noContentToImport: 'Zip did not include any content to import.',
  invalidZipStructure: 'Invalid zip file structure.',
  invalidZipFileBaseDirectory: 'Invalid zip file: base directory read failed',
  invalidZipFileNameEncoding: 'The uploaded zip could not be read',
  invalidZipFileNameEncodingContext: 'The filename was too long or contained invalid characters',
  invalidZipFileNameEncodingHelp:
    'Remove any special characters from the file name, or alternatively try another archiving tool if using MacOS Archive Utility',
};

const ROOT_ONLY = 0;
const ROOT_OR_SINGLE_DIR = 1;
const ALL_DIRS = 2;

export interface ImportArchiveFile {
  name: string;
  path: string;
}

interface ImportArchiveOptions {
  extensions: string[];
  directories: string[];
}

interface ImportArchiveDependencies {
  extract?: (filePath: string, directory: string) => Promise<void>;
}

export default class ImportArchive {
  readonly extensions: string[];
  readonly directories: string[];
  private readonly extractArchive: (filePath: string, directory: string) => Promise<void>;

  constructor(
    { extensions, directories }: ImportArchiveOptions,
    { extract: extractArchive = extract }: ImportArchiveDependencies = {},
  ) {
    this.extensions = extensions;
    this.directories = directories;
    this.extractArchive = extractArchive;
  }

  getGlobPattern(items: string[]): string {
    return `+(${items.join('|')})`;
  }

  getExtensionGlob(extensions: string[], level?: number): string {
    const prefix = level === ALL_DIRS ? '**/*' : level === ROOT_OR_SINGLE_DIR ? '{*/*,*}' : '*';

    return prefix + this.getGlobPattern(extensions);
  }

  getDirectoryGlob(directories: string[], level?: number): string {
    const prefix = level === ALL_DIRS ? '**/' : level === ROOT_OR_SINGLE_DIR ? '{*/,}' : '';

    return prefix + this.getGlobPattern(directories);
  }

  isValid(directory: string): boolean {
    const extMatchesBase = globSync(this.getExtensionGlob(this.extensions, ROOT_OR_SINGLE_DIR), {
      cwd: directory,
      nocase: true,
    });

    const extMatchesAll = globSync(this.getExtensionGlob(this.extensions, ALL_DIRS), {
      cwd: directory,
      nocase: true,
    });

    const dirMatches = this.directories.length
      ? globSync(this.getDirectoryGlob(this.directories, ROOT_OR_SINGLE_DIR), {
          cwd: directory,
        })
      : [];

    if (extMatchesBase.length > 0 || (dirMatches.length > 0 && extMatchesAll.length > 0)) {
      return true;
    }

    if (extMatchesAll.length < 1) {
      throw new errors.UnsupportedMediaTypeError({ message: tpl(messages.noContentToImport) });
    }

    throw new errors.UnsupportedMediaTypeError({ message: tpl(messages.invalidZipStructure) });
  }

  getBaseDirectory(directory: string): string | undefined {
    const extMatches = globSync(this.getExtensionGlob(this.extensions, ROOT_ONLY), {
      cwd: directory,
      nocase: true,
    });

    const dirMatches = this.directories.length
      ? globSync(this.getDirectoryGlob(this.directories, ROOT_ONLY), {
          cwd: directory,
          nocase: true,
        })
      : [];

    if (extMatches.length > 0 || dirMatches.length > 0) {
      return;
    }

    const extMatchesAll = globSync(this.getExtensionGlob(this.extensions, ALL_DIRS), {
      cwd: directory,
      nocase: true,
    });
    const firstMatch = extMatchesAll[0];
    if (!firstMatch) {
      throw new errors.ValidationError({ message: tpl(messages.invalidZipFileBaseDirectory) });
    }

    return firstMatch.split('/')[0];
  }

  getFiles(directory: string, extensions: string[]): ImportArchiveFile[] {
    const globPattern = this.getExtensionGlob(extensions, ALL_DIRS);
    return globSync(globPattern, { cwd: directory, nocase: true }).map((file) => ({
      name: file,
      path: path.join(directory, file),
    }));
  }

  async extract(filePath: string): Promise<string> {
    const tmpDir = path.join(os.tmpdir(), crypto.randomUUID());

    try {
      await this.extractArchive(filePath, tmpDir);

      const files = globSync('**/*', { cwd: tmpDir, nodir: true });
      await Promise.all(files.map((file) => fs.chmod(path.join(tmpDir, file), 0o644)));
    } catch (error) {
      await fs.remove(tmpDir).catch(() => {});
      const message = messageOf(error);

      if (message.startsWith('ENAMETOOLONG:')) {
        throw new errors.UnsupportedMediaTypeError({
          message: tpl(messages.invalidZipFileNameEncoding),
          context: tpl(messages.invalidZipFileNameEncodingContext),
          help: tpl(messages.invalidZipFileNameEncodingHelp),
          code: 'INVALID_ZIP_FILE_NAME_ENCODING',
        });
      }

      if (
        message.includes('end of central directory record signature not found') ||
        message.includes('invalid comment length')
      ) {
        throw new errors.UnsupportedMediaTypeError({
          message: tpl(messages.invalidZipFileNameEncoding),
          code: 'INVALID_ZIP_FILE',
        });
      }

      throw error;
    }

    return tmpDir;
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : '';
}
