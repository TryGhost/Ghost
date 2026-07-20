import {SlackPingService} from './slack-ping-service';

class SlackPingServiceWrapper {
    service?: SlackPingService;

    init(): void {
        if (this.service) {
            // Already done
            return;
        }

        // Wire up all the dependencies
        const {blogIcon} = require('../../lib/image');
        const events = require('../../lib/common/events');
        const logging = require('@tryghost/logging');
        const request = require('@tryghost/request');
        const settingsCache = require('../../../shared/settings-cache');
        const urlService = require('../url');
        const urlUtils = require('../../../shared/url-utils');

        this.service = new SlackPingService({
            blogIcon,
            events,
            logging,
            request,
            settingsCache,
            urlService,
            urlUtils
        });

        this.service.subscribeEvents();
    }
}

export default new SlackPingServiceWrapper();
