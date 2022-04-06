import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class NewsletterManagementComponent extends Component {
    @service store;

    @tracked statusFilter = 'active';

    statusFilters = ['active', 'archived'];
    newsletters = this.store.peekAll('newsletter');

    constructor() {
        super(...arguments);
        this.loadNewslettersTask.perform();
    }

    get activeNewsletters() {
        return this.newsletters.filter(n => n.status === 'active');
    }

    get archivedNewsletters() {
        return this.newsletters.filter(n => n.status === 'archived');
    }

    get filteredNewsletters() {
        return this.newsletters.filter(n => n.status === this.statusFilter);
    }

    get displayingDefault() {
        return this.statusFilter === 'active' && this.activeNewsletters.length === 1;
    }

    @action
    changeStatusFilter(newFilter) {
        this.statusFilter = newFilter;
    }

    @task
    *archiveNewsletterTask(newsletter) {
        newsletter.status = 'archived';
        return yield newsletter.save();
    }

    @task
    *unarchiveNewsletterTask(newsletter) {
        newsletter.status = 'active';
        const result = yield newsletter.save();

        if (this.statusFilter === 'archived' && !this.archivedNewsletters.length) {
            this.statusFilter = 'active';
        }

        return result;
    }

    @task
    *loadNewslettersTask() {
        return yield this.store.findAll('newsletter');
    }
}
