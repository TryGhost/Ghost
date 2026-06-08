const events = require('../../lib/common/events');
const jobsService = require('../jobs');
const ImageDimensionsPrecomputeService = require('./service');

class ImageDimensionsPrecomputeServiceWrapper {
    init() {
        if (this.service) {
            return;
        }

        // Required lazily so the cache:imageSizes adapter is resolved after adapters boot.
        const {cachedImageSizeFromUrl} = require('../../lib/image');

        this.service = new ImageDimensionsPrecomputeService({
            getCachedImageSizeFromUrl: url => cachedImageSizeFromUrl.getCachedImageSizeFromUrl(url),
            jobService: {
                async addJob(name, fn) {
                    return jobsService.addJob({
                        name,
                        job: fn,
                        offloaded: false
                    });
                }
            }
        });

        this.service.listen(events);
    }
}

module.exports = new ImageDimensionsPrecomputeServiceWrapper();
