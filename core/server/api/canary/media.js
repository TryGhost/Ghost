const storage = require('../../adapters/storage');

module.exports = {
    docName: 'media',
    upload: {
        statusCode: 201,
        permissions: false,
        query(frame) {
            return storage.getStorage('media').save(frame.file);
        }
    }
};
