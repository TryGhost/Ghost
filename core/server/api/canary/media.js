const storage = require('../../adapters/storage');

module.exports = {
    docName: 'media',
    upload: {
        statusCode: 201,
        permissions: false,
        async query(frame) {
            let thumbnailPath = null;
            if (frame.files.thumbnail && frame.files.thumbnail[0]) {
                thumbnailPath = await storage.getStorage('media').save(frame.files.thumbnail[0]);
            }

            const filePath = await storage.getStorage('media').save(frame.files.file[0]);

            return {
                filePath,
                thumbnailPath
            };
        }
    }
};
