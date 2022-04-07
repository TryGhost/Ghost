import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class NewsletterManagementComponent extends Component {
    @service store;
    @service router;

    @tracked statusFilter = 'active';
    @tracked filteredNewsletters = [];

    statusFilters = ['active', 'archived'];
    newsletters = this.store.peekAll('newsletter');

    constructor() {
        super(...arguments);
        this.loadNewslettersTask.perform();

        this.router.on('routeDidChange', this.handleNewRouteChange);
    }

    willDestroy() {
        super.willDestroy(...arguments);
        this.router.off('routeDidChange', this.handleNewRouteChange);
    }

    get activeNewsletters() {
        return this.newsletters.filter(n => n.status === 'active');
    }

    get archivedNewsletters() {
        return this.newsletters.filter(n => n.status === 'archived');
    }

    get displayingDefault() {
        return this.statusFilter === 'active' && this.activeNewsletters.length === 1;
    }

    @action
    changeStatusFilter(status) {
        this.statusFilter = status;
        this.updateFilteredNewsletters();
    }

    @action
    updateFilteredNewsletters() {
        this.filteredNewsletters = this.newsletters.filter((n) => {
            return n.status === this.statusFilter
                && !n.isNew
                && !n.isDestroyed;
        });
    }

    @action
    handleNewRouteChange(transition) {
        // NOTE: this is necessary because ember-drag-drop has forced us into using
        // an explicit tracked filteredNewsletters property rather than using a reactive
        // getter that automatically displays newly added newsletters

        if (transition.from.name === 'settings.members-email-labs.new-newsletter') {
            this.updateFilteredNewsletters();
        }
    }

    @task
    *archiveNewsletterTask(newsletter) {
        newsletter.status = 'archived';
        const result = yield newsletter.save();

        this.updateFilteredNewsletters();

        return result;
    }

    @task
    *unarchiveNewsletterTask(newsletter) {
        newsletter.status = 'active';
        const result = yield newsletter.save();

        if (this.statusFilter === 'archived' && !this.archivedNewsletters.length) {
            this.statusFilter = 'active';
        }

        this.updateFilteredNewsletters();

        return result;
    }

    @task
    *loadNewslettersTask() {
        const newsletters = yield this.store.findAll('newsletter');

        this.updateFilteredNewsletters();

        return newsletters;
    }

    @task
    *reorderNewslettersTask() {
        // filteredNewsletters is the array that gets updated by <SortableObjects> whilst dragging.
        // we only want to update ordering when _active_ newsletters are re-ordered to make sure
        // archived newsletters don't end up with a lower sort order than active ones

        if (this.statusFilter !== 'active') {
            return;
        }

        // use filteredNewsletters rather than activeNewsletters so we're using'the ordered array
        const activeNewsletters = this.filteredNewsletters;

        const otherNewsletters = this.newsletters
            .filter(n => !activeNewsletters.includes(n))
            .sort(({sortOrder: a}, {sortOrder: b}) => b - a);

        let sortOrder = 0;

        for (const n of [...activeNewsletters, ...otherNewsletters]) {
            n.sortOrder = sortOrder;
            yield n.save();

            sortOrder += 1;
        }
    }
}
