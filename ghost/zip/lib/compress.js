const fs = require('fs-extra');
const Promise = require('bluebird');

const defaultOptions = {
    type: 'zip',
    glob: '**/*',
    dot: true,
    ignore: ['node_modules/**']
};

/**
 * Compress
 *
 * - Create a zip file from a folder
 *
 * @param {String} folderToZip - full path to the folder to be zipped
 * @param {String} destination - full path to the resulting zip file
 * @param {Object} [options]
 * @param {String} options.type - zip by default see archiver for other options
 * @param {String} options.glob - the files to include, defaults to all files and folders
 * @param {Boolean} options.dot - include all dotfiles and dotfolders
 * @param {Array} options.ignore - any paths that should be ignored, sets node_modules by default
 *
 */
module.exports = (folderToZip, destination, options = {}) => {
    const opts = Object.assign({}, defaultOptions, options);

    const archiver = require('archiver');
    const output = fs.createWriteStream(destination);
    const archive = archiver.create(opts.type);

    return new Promise((resolve, reject) => {
        // If folder to zip is a symlink, we want to get the target
        // of the link and zip that instead of zipping the symlink
        if (fs.lstatSync(folderToZip).isSymbolicLink()) {
            folderToZip = fs.realpathSync(folderToZip);
        }

        output.on('close', function () {
            resolve({path: destination, size: archive.pointer()});
        });

        archive.on('error', function (err) {
            reject(err);
        });
        archive.glob(opts.glob, {
            cwd: folderToZip,
            dot: opts.dot,
            ignore: opts.ignore
        });
        archive.pipe(output);
        archive.finalize();
    });
};
