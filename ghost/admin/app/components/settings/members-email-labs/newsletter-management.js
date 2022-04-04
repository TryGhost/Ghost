import Component from '@glimmer/component';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class NewsletterManagementComponent extends Component {
    @service store;

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

    get hasMultiple() {
        return this.activeNewsletters.length > 1;
    }

    @task
    *archiveNewsletterTask(newsletter) {
        newsletter.status = 'archived';
        return yield newsletter.save();
    }

    @task
    *loadNewslettersTask() {
        return yield this.store.findAll('newsletter');
    }
}
