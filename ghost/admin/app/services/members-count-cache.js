import Service, {inject as service} from '@ember/service';
import moment from 'moment-timezone';
import {action} from '@ember/object';
import {ghPluralize} from 'ghost-admin/helpers/gh-pluralize';
import {task} from 'ember-concurrency';

export default class MembersCountCacheService extends Service {
    @service session;
    @service store;

    cache = {};
    hasMultipleNewsletters = null;

    @action
    async count(query) {
        if (typeof query === 'string') {
            query = {filter: query};
        }

        const cacheKey = JSON.stringify(query);
        const cachedValue = this.cache[cacheKey];

        if (cachedValue && moment().diff(cachedValue.time, 'seconds') <= 60) {
            return cachedValue.count;
        }

        const count = this._countMembersTask.perform(query);

        this.cache[cacheKey] = {count, time: moment()};

        return count;
    }

    @action
    async countString(filter = '', {knownCount, newsletter} = {}) {
        // Determine if we need to show the name of the newsletter or not
        // TODO: replace this with a service or a settings boolean if we ever add a shortcut for this
        if (this.hasMultipleNewsletters === null) {
            const allNewsletters = await this.store.query('newsletter', {status: 'active', limit: 'all'});
            this.hasMultipleNewsletters = allNewsletters.length > 1;
        }

        const user = this.session.user;

        const nounSingular = newsletter && this.hasMultipleNewsletters ? 'subscriber' : 'member';
        const nounPlural = nounSingular + 's';
        const suffix = newsletter && this.hasMultipleNewsletters ? (' of ' + newsletter.name) : '';

        const basicFilter = newsletter ? filter.replace(newsletter.recipientFilter, '').replace(/^\+\((.*)\)$/, '$1') : filter;
        const filterParts = basicFilter.split(',');
        const isFree = filterParts.length === 1 && filterParts[0] === 'status:free';
        const isPaid = filterParts.length === 1 && filterParts[0] === 'status:-free';
        const isAll = !filter || (filterParts.includes('status:free') && filterParts.includes('status:-free'));

        // editors don't have permission to browse members so can't retrieve a count
        // TODO: remove when editors have relevant permissions or we have a different way of fetching counts
        if (user.isEditor && knownCount === undefined) {
            if (isFree) {
                return 'all free ' + nounPlural + suffix;
            }
            if (isPaid) {
                return 'all paid ' + nounPlural + suffix;
            }
            if (isAll) {
                return 'all ' + nounPlural + suffix;
            }

            return 'a custom members segment';
        }

        const recipientCount = knownCount !== undefined ? knownCount : await this.count(filter);

        if (isFree) {
            return ghPluralize(recipientCount, 'free ' + nounSingular) + suffix;
        }

        if (isPaid) {
            return ghPluralize(recipientCount, 'paid ' + nounSingular) + suffix;
        }

        return ghPluralize(recipientCount, nounSingular) + suffix;
    }

    @action
    clear() {
        this.cache = {};
    }

    @task
    *_countMembersTask(query) {
        if (!query) {
            return 0;
        }

        try {
            const result = yield this.store.query('member', {...query, limit: 1, page: 1});
            return result.meta.pagination.total;
        } catch (e) {
            console.error(e); // eslint-disable-line
            return 0;
        }
    }
}
