import {IndexNowPingService} from './indexnow-ping-service';

class IndexNowPingServiceWrapper {
    service?: IndexNowPingService;

    init(): void {
        if (this.service) {
            // Already done
            return;
        }

        // Wire up all the dependencies
        const settingsCache = require('../../../shared/settings-cache');
        const config = require('../../../shared/config');
        const labs = require('../../../shared/labs');
        const urlService = require('../url');
        const urlUtils = require('../../../shared/url-utils');
        const request = require('@tryghost/request');
        const logging = require('@tryghost/logging');
        const events = require('../../lib/common/events');

        this.service = new IndexNowPingService({
            settingsCache,
            config,
            labs,
            urlService,
            urlUtils,
            request,
            logging,
            events
        });

        this.service.subscribeEvents();
    }
}

export default new IndexNowPingServiceWrapper();
