import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class BulkUnsubscribeMembersModal extends Component {
    @service ajax;
    @service ghostPaths;
    @service store;

    @tracked error;
    @tracked response;

    get isDisabled() {
        return !this.args.data.query;
    }

    get hasRun() {
        return !!(this.error || this.response);
    }

    get hasMultipleNewsletters() {
        const newsletters = this.store.peekAll('newsletter');
        const activeNewsletters = newsletters.filter(newsletter => newsletter.status !== 'archived');
        if (activeNewsletters.length <= 1) {
            return false;
        } else {
            return true;
        }
    }

    get newsletterList() {
        const newsletters = this.store.peekAll('newsletter');
        const activeNewsletters = newsletters.filter(newsletter => newsletter.status !== 'archived');

        return activeNewsletters.map((newsletter) => {
            return {
                label: newsletter.name,
                value: newsletter.id
            };
        });
    }

    @action
    setLabel(label) {
        this.selectedLabel = label;
    }

    @task({drop: true})
    *bulkUnsubscribeTask() {
        try {
            const query = new URLSearchParams(this.args.data.query);
            const removeLabelUrl = `${this.ghostPaths.url.api('members/bulk')}?${query}`;
            const response = yield this.ajax.put(removeLabelUrl, {
                data: {
                    bulk: {
                        action: 'unsubscribe',
                        meta: {}
                    }
                }
            });

            this.args.data.onComplete?.();

            this.response = response?.bulk?.meta;

            return true;
        } catch (e) {
            if (e.payload?.errors) {
                this.error = e.payload.errors[0].message;
            } else {
                this.error = 'An unknown error occurred. Please try again.';
            }
            throw e;
        }
    }
}
