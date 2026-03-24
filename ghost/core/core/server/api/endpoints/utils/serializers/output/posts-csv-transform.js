const {Transform} = require('stream');
const papaparse = require('papaparse');

/**
 * Create a CSV Transform stream for posts export.
 * Accepts a stream of post objects and outputs CSV text.
 * First chunk includes headers, subsequent chunks are data-only.
 *
 * @returns {Transform}
 */
function createCSVTransform() {
    let isFirstChunk = true;
    let fields = null;

    return new Transform({
        objectMode: true,
        transform(post, encoding, callback) {
            try {
                if (isFirstChunk) {
                    fields = Object.keys(post);
                    const csv = papaparse.unparse({
                        fields,
                        data: [post]
                    }, {
                        header: true,
                        escapeFormulae: true,
                        newline: '\r\n'
                    });
                    isFirstChunk = false;
                    callback(null, csv);
                } else {
                    const csv = papaparse.unparse({
                        fields,
                        data: [post]
                    }, {
                        header: false,
                        escapeFormulae: true,
                        newline: '\r\n'
                    });
                    callback(null, '\r\n' + csv.replace(/^\r?\n+/, ''));
                }
            } catch (err) {
                callback(err);
            }
        }
    });
}

module.exports = {
    createCSVTransform
};
