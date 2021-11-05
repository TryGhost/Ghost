const storage = require('../../adapters/storage');

module.exports = {
    docName: 'media',
    upload: {
        statusCode: 201,
        permissions: false,
        async query(frame) {
            let thumbnail = null;
            if (frame.files.thumbnail && frame.files.thumbnail[0]) {
                thumbnail = await storage.getStorage('media').save(frame.files.thumbnail[0]);
            }

            const file = await storage.getStorage('media').save(frame.files.file[0]);

            return {
                filePath: file,
                thumbnailPath: thumbnail
            };
        }
    }
};
