const path = require('path');

module.exports = {
    uploadThumbnail(apiConfig, frame) {
        const parentFileName = path.basename(frame.data.url, path.extname(frame.data.url));
        frame.file.name = `${parentFileName}_thumb${frame.file.ext}`;
    }
};
