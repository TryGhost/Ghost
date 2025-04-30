import Service, {inject as service} from '@ember/service';
import fetch from 'fetch';
import moment from 'moment-timezone';
import {action, computed} from '@ember/object';
import {isEmpty} from '@ember/utils';
import {task} from 'ember-concurrency';

export default Service.extend({
    session: service(),
    store: service(),
    response: null,

    entries: null,
    changelogUrl: 'https://ghost.org/blog/',
    isShowingModal: false,

    _user: null,

    init() {
        this._super(...arguments);
        this.entries = [];
    },

    whatsNewSettings: computed('_user.accessibility', function () {
        let settingsJson = this.get('_user.accessibility') || '{}';
        let settings = JSON.parse(settingsJson);
        return settings.whatsNew;
    }),

    hasNew: computed('whatsNewSettings.lastSeenDate', 'entries.[]', function () {
        if (isEmpty(this.entries)) {
            return false;
        }

        let [latestEntry] = this.entries;

        let lastSeenDate = this.get('whatsNewSettings.lastSeenDate') || '2019-01-01 00:00:00';
        let lastSeenMoment = moment(lastSeenDate);
        let latestDate = latestEntry.published_at;
        let latestMoment = moment(latestDate || lastSeenDate);
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
        try {
            if (!this.response) {
                // we should already be logged in at this point so lets grab the user
                // record and store it locally so that we don't have to deal with
                // session.user being a promise and causing issues with CPs
                let user = yield this.session.user;
                this.set('_user', user);

                this.response = yield fetch('https://ghost.org/changelog.json');
                if (!this.response.ok) {
                    // eslint-disable-next-line
                    return console.error('Failed to fetch changelog', {response});
                }

                let result = yield this.response.json();
                this.set('entries', result.posts || []);
                this.set('changelogUrl', result.changelogUrl);
            }
        } catch (e) {
            console.error(e); // eslint-disable-line
        }
    }),

    updateLastSeen: task(function* () {
        let settingsJson = this._user.accessibility || '{}';
        let settings = JSON.parse(settingsJson);
        let [latestEntry] = this.entries;

        if (!latestEntry) {
            return;
        }

        if (!settings.whatsNew) {
            settings.whatsNew = {};
        }

        settings.whatsNew.lastSeenDate = latestEntry.published_at;

        this._user.set('accessibility', JSON.stringify(settings));
        yield this._user.save();
    })
});
