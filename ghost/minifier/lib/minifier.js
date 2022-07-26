const errors = require('@tryghost/errors');
const debug = require('@tryghost/debug')('minifier');
const tpl = require('@tryghost/tpl');
const csso = require('csso');
const terser = require('terser');
const glob = require('tiny-glob');
const path = require('path');
const fs = require('fs').promises;

const messages = {
    badDestination: {
        message: 'Unexpected destination {dest}',
        context: 'Minifier expected a destination that ended in .css or .js'
    },
    badSource: {
        message: 'Unable to read source files {src}',
        context: 'Minifier was unable to locate or read the source files'
    },
    missingConstructorOption: {
        message: 'Minifier missing {opt} option',
        context: 'new Minifier({}) requires a {opt} option'
    },
    globalHelp: 'Refer to the readme for @tryghost/minifier for how to use this module'
};

// public API for minify hooks
class Minifier {
    constructor({src, dest}) {
        if (!src) {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.missingConstructorOption.message, {opt: 'src'}),
                context: tpl(messages.missingConstructorOption.context, {opt: 'src'}),
                help: tpl(messages.globalHelp)
            });
        }
        if (!dest) {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.missingConstructorOption.message, {opt: 'dest'}),
                context: tpl(messages.missingConstructorOption.context, {opt: 'dest'}),
                help: tpl(messages.globalHelp)
            });
        }
        this.srcPath = src;
        this.destPath = dest;
    }

    getFullSrc(src) {
        return path.join(this.srcPath, src);
    }

    getFullDest(dest) {
        return path.join(this.destPath, dest);
    }

    async minifyCSS(contents) {
        const result = await csso.minify(contents);
        if (result && result.css) {
            return result.css;
        }
        return null;
    }

    async minifyJS(contents) {
        const result = await terser.minify(contents);
        if (result && result.code) {
            return result.code;
        }
        return null;
    }

    async getMatchingFiles(src) {
        return await glob(this.getFullSrc(src));
    }

    async readFiles(files) {
        let mergedFiles = '';
        for (const file of files) {
            const contents = await fs.readFile(file, 'utf8');
            mergedFiles += contents;
        }

        return mergedFiles;
    }

    async getSrcFileContents(src) {
        try {
            const files = await this.getMatchingFiles(src);

            if (files) {
                return await this.readFiles(files);
            }
        } catch (error) {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.badSource.message, {src}),
                context: tpl(messages.badSource.context),
                help: tpl(messages.globalHelp)
            });
        }
    }

    async writeFile(contents, dest) {
        if (contents) {
            let writePath = this.getFullDest(dest);
            // Ensure the output folder exists
            await fs.mkdir(this.destPath, {recursive: true});
            // Create the file
            await fs.writeFile(writePath, contents);
            return writePath;
        }
    }

    async minify(options) {
        debug('Begin', options);
        const destinations = Object.keys(options);
        const minifiedFiles = [];

        for (const dest of destinations) {
            const src = options[dest];
            const contents = await this.getSrcFileContents(src);
            let minifiedContents;

            if (dest.endsWith('.css')) {
                minifiedContents = await this.minifyCSS(contents);
            } else if (dest.endsWith('.js')) {
                minifiedContents = await this.minifyJS(contents);
            } else {
                throw new errors.IncorrectUsageError({
                    message: tpl(messages.badDestination.message, {dest}),
                    context: tpl(messages.badDestination.context),
                    help: tpl(messages.globalHelp)
                });
            }

            const result = await this.writeFile(minifiedContents, dest);
            if (result) {
                minifiedFiles.push(dest);
            }
        }

        debug('End');
        return minifiedFiles;
    }
}

module.exports = Minifier;
