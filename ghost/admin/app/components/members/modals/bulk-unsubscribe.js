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

    @tracked selectedNewsletterId = null;

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
        let list = [{
            name: 'All newsletters',
            value: 'all'
        }];
        activeNewsletters.forEach((newsletter) => {
            list.push({
                name: newsletter.name,
                value: newsletter.id
            });
        });
        return list;
    }

    @action
    setLabel(label) {
        this.selectedLabel = label;
    }

    @action
    setSelectedNewsletter(newsletter) {
        if (newsletter === 'all') {
            this.selectedNewsletterId = null;
        } else {
            this.selectedNewsletterId = newsletter;
        }
    }

    @task({drop: true})
    *bulkUnsubscribeTask() {
        try {
            let args = this.args.data.query;
            const query = new URLSearchParams(args);
            const removeLabelUrl = `${this.ghostPaths.url.api('members/bulk')}?${query}`;
            const response = yield this.ajax.put(removeLabelUrl, {data: {
                bulk: {
                    action: 'unsubscribe',
                    newsletter: (this.selectedNewsletterId ? this.selectedNewsletterId : null),
                    meta: {}
                }
            }});

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
