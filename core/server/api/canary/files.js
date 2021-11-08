const storage = require('../../adapters/storage');

module.exports = {
    docName: 'files',
    upload: {
        statusCode: 201,
        permissions: false,
        async query(frame) {
            const filePath = await storage.getStorage('files').save({
                name: frame.file.originalname,
                path: frame.file.path
            });

            return {
                filePath
            };
        }
    }
};
