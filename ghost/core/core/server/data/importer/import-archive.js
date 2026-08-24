const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { globSync } = require('glob');
const { extract } = require('@tryghost/zip');
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

class ImportArchive {
  /**
   * @param {Object} options
   * @param {string[]} options.extensions
   * @param {string[]} options.directories
   */
  constructor({ extensions, directories }) {
    this.extensions = extensions;
    this.directories = directories;
  }

  getGlobPattern(items) {
    return (
      '+(' +
      _.reduce(
        items,
        function (memo, item) {
          return memo !== '' ? memo + '|' + item : item;
        },
        '',
      ) +
      ')'
    );
  }

  getExtensionGlob(extensions, level) {
    const prefix = level === ALL_DIRS ? '**/*' : level === ROOT_OR_SINGLE_DIR ? '{*/*,*}' : '*';

    return prefix + this.getGlobPattern(extensions);
  }

  getDirectoryGlob(directories, level) {
    const prefix = level === ALL_DIRS ? '**/' : level === ROOT_OR_SINGLE_DIR ? '{*/,}' : '';

    return prefix + this.getGlobPattern(directories);
  }

  isValid(directory) {
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

  getBaseDirectory(directory) {
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
    if (extMatchesAll.length < 1 || extMatchesAll[0].split('/').length < 1) {
      throw new errors.ValidationError({ message: tpl(messages.invalidZipFileBaseDirectory) });
    }

    return extMatchesAll[0].split('/')[0];
  }

  getFiles(directory, extensions) {
    const globPattern = this.getExtensionGlob(extensions, ALL_DIRS);
    return _.map(globSync(globPattern, { cwd: directory, nocase: true }), function (file) {
      return { name: file, path: path.join(directory, file) };
    });
  }

  async extract(filePath) {
    const tmpDir = path.join(os.tmpdir(), crypto.randomUUID());

    try {
      await extract(filePath, tmpDir);

      const files = globSync('**/*', { cwd: tmpDir, nodir: true });
      await Promise.all(files.map((file) => fs.chmod(path.join(tmpDir, file), 0o644)));
    } catch (err) {
      await fs.remove(tmpDir).catch(() => {});

      if (err.message.startsWith('ENAMETOOLONG:')) {
        throw new errors.UnsupportedMediaTypeError({
          message: tpl(messages.invalidZipFileNameEncoding),
          context: tpl(messages.invalidZipFileNameEncodingContext),
          help: tpl(messages.invalidZipFileNameEncodingHelp),
          code: 'INVALID_ZIP_FILE_NAME_ENCODING',
        });
      }

      if (
        err.message.includes('end of central directory record signature not found') ||
        err.message.includes('invalid comment length')
      ) {
        throw new errors.UnsupportedMediaTypeError({
          message: tpl(messages.invalidZipFileNameEncoding),
          code: 'INVALID_ZIP_FILE',
        });
      }

      throw err;
    }

    return tmpDir;
  }
}

module.exports = ImportArchive;
