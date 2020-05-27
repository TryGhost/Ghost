import Service from '@ember/service';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class MembersStatsService extends Service {
    @service ajax;
    @service ghostPaths;

    @tracked stats = null;

    fetch({days}) {
        // return existing stats unless data is > 1 min old
        let daysChanged = days === this._days;
        let staleData = this._lastFetched && this._lastFetched - new Date() > 1 * 60 * 1000;
        if (this.stats && !this._forceRefresh && !daysChanged && !staleData) {
            return Promise.resolve(this.stats);
        }

        this._forceRefresh = false;
        this._days = days;
        this._lastFetched = new Date();

        let statsUrl = this.ghostPaths.url.api('members/stats');

        return this.ajax.request(statsUrl, {data: {days}}).then((stats) => {
            this.stats = stats;
            return stats;
        });
    }

    invalidate() {
        this._forceRefresh = true;
    }
}
