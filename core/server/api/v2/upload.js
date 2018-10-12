const fs = require('fs-extra');
const storage = require('../../adapters/storage');

module.exports = {
    docName: 'upload',
    image: {
        statusCode: 201,
        permissions: false,
        query(frame) {
            const store = storage.getStorage();

            if (frame.files) {
                return Promise.map(frame.files, (file) => {
                    return store
                        .save(file)
                        .finally(() => {
                            // Remove uploaded file from tmp location
                            return fs.unlink(file.path);
                        });
                }).then((paths) => {
                    return paths[0];
                });
            }

            return store.save(frame.file).finally(() => {
                // Remove uploaded file from tmp location
                return fs.unlink(frame.file.path);
            });
        }
    }
};
