const common = require('../../../../lib/common');
const storage = require('../../../../adapters/storage');
const LocalFileStorage = require('../../../../adapters/storage/LocalFileStorage');

module.exports.up = () => {
    const storageInstance = storage.getStorage();

    if (!(storageInstance instanceof LocalFileStorage)) {
        common.logging.warn(`Image storage is not LocalFileStorage - skipping ${__filename} migration`);
        return Promise.resolve();
    }

    // TODO: Walk through all files in storageInstance.storagePath,
    // for each file, lookup original and copy it to `/original/${fileName}`
    // NOTE: copying is safer than moving, even though it will take more time and space
    // NOTE: if filesystem supports hardlinks, use those instead of copying

    return Promise.resolve();
};

module.exports.down = () => {
    // Do nothing

    return Promise.resolve();
};
