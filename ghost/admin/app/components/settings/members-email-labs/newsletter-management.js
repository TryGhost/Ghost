import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class NewsletterManagementComponent extends Component {
    @service newsletters;
    @service store;

    get activeNewsletters() {
        return this.newsletters.newsletters.filter(n => n.status === 'active');
    }

    get archivedNewsletters() {
        return this.newsletters.newsletters.filter(n => n.status === 'archived');
    }

    get hasMultiple() {
        return this.activeNewsletters.length > 1;
    }

    @action
    addNewsletter() {
        this.newsletters.add();
    }

    @action
    archiveNewsletter(id) {
        this.newsletters.archive(id);
    }
}
