// const debug = require('@tryghost/debug')('comments-counts-assets');
const Minifier = require('@tryghost/minifier');
const path = require('path');
const fs = require('fs').promises;
const logging = require('@tryghost/logging');
const config = require('../../../shared/config');

class CommentCountsAssetsService {
    constructor(options = {}) {
        this.src = options.src || path.join(config.get('paths').assetSrc, 'comment-counts');
        this.dest = options.dest || config.getContentPath('public');
        this.minifier = new Minifier({src: this.src, dest: this.dest});

        this.files = [];
    }

    generateGlobs() {
        return {
            'comment-counts.min.js': 'js/*.js'
        };
    }

    async minify(globs) {
        try {
            return await this.minifier.minify(globs);
        } catch (error) {
            if (error.code === 'EACCES') {
                logging.error('Ghost was not able to write comment-count asset files due to permissions.');
                return;
            }

            throw error;
        }
    }

    async clearFiles() {
        this.files = [];

        const rmFile = async (name) => {
            await fs.unlink(path.join(this.dest, name));
        };

        let promises = [
            // @deprecated switch this to use fs.rm when we drop support for Node v12
            rmFile('comment-counts.min.js')
        ];

        // We don't care if removing these files fails as it's valid for them to not exist
        return Promise.allSettled(promises);
    }

    async load() {
        await this.clearFiles();
        const globs = this.generateGlobs();
        this.files = await this.minify(globs);
    }
}

module.exports = CommentCountsAssetsService;
