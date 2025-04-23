const path = require('node:path');
const fs = require('node:fs/promises');

function createServeAuthFrameFileMw(config, urlUtils) {
    const placeholders = {
        '{{SITE_ORIGIN}}': new URL(urlUtils.getSiteUrl()).origin
    };

    return function serveAuthFrameFileMw(req, res, next) {
        const filename = path.parse(req.url).base;

        let basePath = path.join(config.get('paths').publicFilePath, 'admin-auth');
        let filePath;

        if (filename === '') {
            filePath = path.join(basePath, 'index.html');
        } else {
            filePath = path.join(basePath, filename);
        }

        return fs.readFile(filePath).then((data) => {
            let dataString = data.toString();

            for (const [key, value] of Object.entries(placeholders)) {
                dataString = dataString.replace(key, value);
            }

            res.end(dataString);
        }).catch(() => {
            return next();
        });
    };
}

module.exports = createServeAuthFrameFileMw;