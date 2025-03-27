import Service from '@ember/service';
import {action} from '@ember/object';
import {isBlank} from '@ember/utils';
import {inject as service} from '@ember/service';
import {task, timeout} from 'ember-concurrency';

export default class SearchService extends Service {
    @service ajax;
    @service feature;
    @service notifications;
    @service searchProviderBasic;
    @service searchProviderFlex;
    @service settings;
    @service store;

    isContentStale = true;

    get provider() {
        const isEnglish = this.settings.locale?.toLowerCase().startsWith('en') ?? true;
        return isEnglish ? this.searchProviderFlex : this.searchProviderBasic;
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
        this.refreshContentTask.perform();

        // debounce searches to 200ms to avoid thrashing CPU
        yield timeout(200);

        // wait for any on-going refresh to finish
        if (this.refreshContentTask.isRunning) {
            yield this.refreshContentTask.lastRunning;
        }

        return yield this.provider.searchTask.perform(term);
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
