import Service from '@ember/service';
import moment from 'moment';
import {ghPluralize} from 'ghost-admin/helpers/gh-pluralize';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';

export default class MembersCountCacheService extends Service {
    @service session;
    @service store;

    cache = {};

    async count(filter) {
        const cachedValue = this.cache[filter];

        if (cachedValue && moment().diff(cachedValue.time, 'seconds') > 60) {
            return cachedValue.count;
        }

        const count = this._countMembersTask.perform(filter);

        this.cache[filter] = {count, time: moment()};

        return count;
    }

    async countString(filter = '', {knownCount} = {}) {
        const user = await this.session.user;

        const basicFilter = filter.replace(/^subscribed:true\+\((.*)\)$/, '$1');
        const filterParts = basicFilter.split(',');
        const isFree = filterParts.length === 1 && filterParts[0] === 'status:free';
        const isPaid = filterParts.length === 1 && filterParts[0] === 'status:-free';
        const isAll = !filter || (filterParts.includes('status:free') && filterParts.includes('status:-free');)

        // editors don't have permission to browse members so can't retrieve a count
        // TODO: remove when editors have relevant permissions or we have a different way of fetching counts
        if (user.isEditor && knownCount === undefined) {
            if (isFree) {
                return 'all free members';
            }
            if (isPaid) {
                return 'all paid members';
            }
            if (isAll) {
                return 'all members';
            }

            return 'a custom members segment';
        }

        const recipientCount = knownCount !== undefined ? knownCount : await this.count(filter);

        if (isFree) {
            return ghPluralize(recipientCount, 'free member');
        }

        if (isPaid) {
            return ghPluralize(recipientCount, 'paid member');
        }

        return ghPluralize(recipientCount, 'member');
    }

    @task
    *_countMembersTask(filter) {
        if (!filter) {
            return 0;
        }

        try {
            const result = yield this.store.query('member', {filter, limit: 1, page: 1});
            return result.meta.pagination.total;
        } catch (e) {
            console.error(e); // eslint-disable-line
            return 0;
        }
    }
}
