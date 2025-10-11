import Service, {inject as service} from '@ember/service';
import fetch from 'fetch';
import moment from 'moment-timezone';
import {action, computed} from '@ember/object';
import {isEmpty} from '@ember/utils';
import {task} from 'ember-concurrency';

export default Service.extend({
    session: service(),

    entries: null,
    changelogUrl: 'https://ghost.org/blog/',
    isShowingModal: false,

    // We only want to request the changelog once, so we store the initial
    // response so we don't request it again.
    _changelog_response: null,

    // Track only the whatsNew slice of user.accessibility settings
    _whatsNewSettings: null,

    init() {
        this._super(...arguments);
        this.entries = [];
        // Set sensible default for new users - they've "seen" everything up to now
        this._whatsNewSettings = {
            lastSeenDate: moment.utc().toISOString()
        };
    },

    hasNew: computed('_whatsNewSettings.lastSeenDate', 'entries.[]', function () {
        if (isEmpty(this.entries)) {
            return false;
        }

        let [latestEntry] = this.entries;
        let lastSeenMoment = moment(this._whatsNewSettings.lastSeenDate);
        let latestMoment = moment(latestEntry.published_at);

        return latestMoment.isAfter(lastSeenMoment);
    }),

    hasNewFeatured: computed('entries.[]', function () {
        if (!this.hasNew) {
            return false;
        }

        let [latestEntry] = this.entries;
        return latestEntry.featured;
    }),

    seen: action(function () {
        this.updateLastSeen.perform();
    }),

    openFeaturedModal: action(function () {
        this.set('isShowingModal', true);
    }),

    closeFeaturedModal: action(function () {
        this.set('isShowingModal', false);
        this.seen();
    }),

    fetchLatest: task(function* () {
        if (this._changelog_response) {
            // We've already fetched the changelog so we don't fetch it again.
            return;
        }

        try {
            // Load user's persisted settings
            let user = yield this.session.user;
            let accessibility = JSON.parse(user.accessibility || '{}');
            let whatsNewSettings = accessibility.whatsNew;

            if (!whatsNewSettings?.lastSeenDate) {
                // New user - persist the defaults from init()
                whatsNewSettings = this._whatsNewSettings;
                accessibility.whatsNew = whatsNewSettings;
                user.set('accessibility', JSON.stringify(accessibility));
                yield user.save();
            }

            // Always set (either loaded existing settings or the defaults we just persisted)
            this.set('_whatsNewSettings', whatsNewSettings);

            // Fetch changelog
            this._changelog_response = yield fetch('https://ghost.org/changelog.json');
            if (!this._changelog_response.ok) {
                // eslint-disable-next-line
                return console.error('Failed to fetch changelog', this._changelog_response);
            }

            let result = yield this._changelog_response.json();
            this.set('entries', result.posts || []);
            this.set('changelogUrl', result.changelogUrl);
        } catch (e) {
            console.error(e); // eslint-disable-line
        }
    }),

    updateLastSeen: task(function* () {
        let [latestEntry] = this.entries;

        if (!latestEntry) {
            return;
        }

        // Update our local whatsNew settings
        this.set('_whatsNewSettings', {
            ...this._whatsNewSettings,
            lastSeenDate: latestEntry.published_at
        });

        // Persist using read-merge-write pattern
        let user = yield this.session.user;
        let accessibility = JSON.parse(user.accessibility || '{}');
        accessibility.whatsNew = this._whatsNewSettings;
        user.set('accessibility', JSON.stringify(accessibility));
        yield user.save();
    })
});
