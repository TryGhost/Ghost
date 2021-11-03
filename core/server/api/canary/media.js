const storage = require('../../adapters/storage');

module.exports = {
    docName: 'media',
    upload: {
        statusCode: 201,
        permissions: false,
        async query(frame) {
            const file = await storage.getStorage('media').save(frame.files.file[0]);
            const thumbnail = await storage.getStorage('media').save(frame.files.thumbnail[0]);

            return {
                filePath: file,
                thumbnailPath: thumbnail
            };
        }
    }
};
