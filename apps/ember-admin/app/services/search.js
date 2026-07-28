import Service from '@ember/service';
import {GHOST_PRO_GROUP_NAME} from '../utils/search';
import {action} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
import {isBlank} from '@ember/utils';
import {inject as service} from '@ember/service';
import {task, timeout} from 'ember-concurrency';

export default class SearchService extends Service {
    @service ajax;
    @service feature;
    @service notifications;
    @service searchProviderBasic;
    @service searchProviderFlex;
    @service session;
    @service settings;
    @service store;

    @inject config;

    isContentStale = true;

    get provider() {
        const isEnglish = this.settings.locale?.toLowerCase().startsWith('en') ?? true;
        return isEnglish ? this.searchProviderFlex : this.searchProviderBasic;
    }

    // Ghost(Pro) results deep-link into the billing app, so they're only shown
    // when billing is enabled for the site and the current user is allowed to
    // open it (mirrors the access rules in the `pro` route)
    get #canAccessBilling() {
        const billingEnabled = Boolean(this.config.hostSettings?.billing?.enabled);
        const userCanAccessBilling = Boolean(this.session.user?.isOwnerOnly) || Boolean(this.config.hostSettings?.forceUpgrade);

        return billingEnabled && userCanAccessBilling;
    }

    @action
    expireContent() {
        this.isContentStale = true;
    }

    @task({restartable: true})
    *searchTask(term) {
        if (isBlank(term)) {
            return [];
        }

        // start loading immediately in the background
        this.refreshContentTask.unlinked().perform();

        // debounce searches to 200ms to avoid thrashing CPU
        yield timeout(200);

        // wait for any on-going refresh to finish
        if (this.refreshContentTask.isRunning) {
            yield this.refreshContentTask.lastRunning;
        }

        const results = yield this.provider.searchTask.perform(term);

        if (!this.#canAccessBilling) {
            return results.filter(group => group.groupName !== GHOST_PRO_GROUP_NAME);
        }

        return results;
    }

    @task({drop: true})
    *refreshContentTask({forceRefresh = false} = {}) {
        if (!forceRefresh && !this.isContentStale) {
            return true;
        }

        this.isContentStale = true;

        yield this.provider.refreshContentTask.perform();

        this.isContentStale = false;
    }
}
