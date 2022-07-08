// const debug = require('@tryghost/debug')('comments-counts-assets');
const Minifier = require('@tryghost/minifier');
const path = require('path');
const fs = require('fs').promises;
const logging = require('@tryghost/logging');
const config = require('../../../shared/config');

class AdminAuthAssetsService {
    constructor(options = {}) {
        this.src = options.src || path.join(config.get('paths').assetSrc, 'admin-auth');
        this.dest = options.dest || path.join(config.getContentPath('public'), 'admin-auth');
        this.minifier = new Minifier({src: this.src, dest: this.dest});
    }

    generateGlobs() {
        return {
            'admin-auth.min.js': '*.js'
        };
    }

    async minify(globs) {
        try {
            return await this.minifier.minify(globs);
        } catch (error) {
            if (error.code === 'EACCES') {
                logging.error('Ghost was not able to write admin-auth asset files due to permissions.');
                return;
            }

            throw error;
        }
    }

    async copyStatic() {
        try {
            return await fs.copyFile(path.join(this.src, 'index.html'), path.join(this.dest, 'index.html'));
        } catch (error) {
            if (error.code === 'EACCES') {
                logging.error('Ghost was not able to write admin-auth asset files due to permissions.');
                return;
            }

            throw error;
        }
    }

    async clearFiles() {
        const rmFile = async (name) => {
            await fs.unlink(path.join(this.dest, name));
        };

        let promises = [
            // @deprecated switch this to use fs.rm when we drop support for Node v12
            rmFile('admin-auth.min.js'),
            rmFile('index.html')
        ];

        // We don't care if removing these files fails as it's valid for them to not exist
        return Promise.allSettled(promises);
    }

    async load() {
        await this.clearFiles();
        this.copyStatic();
        const globs = this.generateGlobs();
        await this.minify(globs);
    }
}

module.exports = AdminAuthAssetsService;
