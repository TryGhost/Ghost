const {Job} = require('../jobs/v2');

/**
 * Payload for the external media inlining job — pure, JSON-serialisable
 * data. The handler is registered centrally in
 * services/jobs/v2/register-handlers.js and closes over the media inliner
 * service.
 */
class MediaInlinerJob extends Job {
    static type = 'media-inliner';

    /**
     * @param {object} data
     * @param {string[]} data.domains - domains to inline media from
     */
    constructor({domains}) {
        super({domains});
    }
}

module.exports = MediaInlinerJob;
