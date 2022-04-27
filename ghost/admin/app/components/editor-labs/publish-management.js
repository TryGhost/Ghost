import Component from '@glimmer/component';
import PublishFlowModal from './modals/publish-flow';
import PublishOptionsResource from 'ghost-admin/helpers/publish-options';
import moment from 'moment';
import {action, get} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';
import {use} from 'ember-could-get-used-to-this';

export class PublishOptions {
    // passed in services
    config = null;
    settings = null;
    store = null;

    // passed in models
    post = null;
    user = null;

    get isLoading() {
        return this.setupTask.isRunning;
    }

    // publish date ------------------------------------------------------------

    @tracked isScheduled = false;
    @tracked scheduledAtUTC = this.minScheduledAt;

    get minScheduledAt() {
        return moment.utc().add(5, 'minutes');
    }

    @action
    toggleScheduled(shouldSchedule) {
        if (shouldSchedule === undefined) {
            shouldSchedule = !this.isScheduled;
        }

        this.isScheduled = shouldSchedule;

        if (shouldSchedule && (!this.scheduledAtUTC || this.scheduledAtUTC.isBefore(this.minScheduledAt))) {
            this.scheduledAtUTC = this.minScheduledAt;
        }
    }

    @action
    setScheduledAt(date) {
        if (moment.utc(date).isBefore(this.minScheduledAt)) {
            return;
        }

        this.scheduledAtUTC = moment.utc(date);
    }

    @action
    resetPastScheduledAt() {
        if (this.scheduledAtUTC.isBefore(this.minScheduledAt)) {
            this.isScheduled = false;
            this.scheduledAt = null;
        }
    }

    // publish type ------------------------------------------------------------

    @tracked publishType = 'publish+send';

    get publishTypeOptions() {
        return [{
            value: 'publish+send',
            label: 'Publish and email',
            display: 'Publish and email',
            disabled: this.emailDisabled
        }, {
            value: 'publish',
            label: 'Publish only',
            display: 'Publish on site'
        }, {
            value: 'send',
            label: 'Email only',
            display: 'Send email',
            disabled: this.emailDisabled
        }];
    }

    get selectedPublishTypeOption() {
        return this.publishTypeOptions.find(pto => pto.value === this.publishType);
    }

    // publish type dropdown is not shown at all
    get emailUnavailable() {
        const emailDisabled = get(this.settings, 'editorDefaultEmailRecipients') === 'disabled'
            || get(this.settings, 'membersSignupAccess') === 'none';

        return this.post.isPage || this.post.email || !this.user.canEmail || emailDisabled;
    }

    // publish type dropdown is shown but email options are disabled
    get emailDisabled() {
        const mailgunConfigured = get(this.settings, 'mailgunIsConfigured')
            || get(this.config, 'mailgunIsConfigured');

        // TODO: check members count
        // TODO: check email limit

        return !mailgunConfigured;
    }

    @action
    setPublishType(newValue) {
        // TODO: validate option is allowed when setting?
        this.publishType = newValue;
    }

    // newsletter --------------------------------------------------------------

    newsletters = []; // set in constructor

    get defaultNewsletter() {
        return this.newsletters.sort(({sortOrder: a}, {sortOrder: b}) => b - a)[0];
    }

    get onlyDefaultNewsletter() {
        return this.newsletters.length === 1;
    }

    // recipients --------------------------------------------------------------

    // setup -------------------------------------------------------------------

    constructor({config, post, settings, store, user} = {}) {
        this.config = config;
        this.post = post;
        this.settings = settings;
        this.store = store;
        this.user = user;

        // these need to be set here rather than class-level properties because
        // unlike Ember-based classes the services are not injected so can't be
        // used until after they are assigned above
        this.newsletters = this.store.peekAll('newsletter').filter(n => n.status === 'active');

        this.setupTask.perform();
    }

    @task
    *setupTask() {
        yield this.fetchRequiredDataTask.perform();

        // TODO: set up initial state / defaults

        if (this.emailUnavailable || this.emailDisabled) {
            this.publishType = 'publish';
        }
    }

    @task
    *fetchRequiredDataTask() {
        // total # of members - used to enable/disable email
        const countTotalMembers = this.store.query('member', {limit: 1}).then(res => res.meta.pagination.total);

        // email limits
        // TODO: query limit service

        // newsletters
        const fetchNewsletters = this.store.findAll('newsletter', {reload: true});

        yield Promise.all([countTotalMembers, fetchNewsletters]);
    }
}

// This component exists for the duration of the editor screen being open.
// It's used to store the selected publish options and control the publishing flow.
export default class PublishManagement extends Component {
    @service modals;

    // ensure we get a new PublishOptions instance when @post is replaced
    @use publishOptions = new PublishOptionsResource(() => [this.args.post]);

    publishFlowModal = null;

    willDestroy() {
        super.willDestroy(...arguments);
        this.publishFlowModal?.close();
    }

    @action
    openPublishFlow(event) {
        event?.preventDefault();

        if (!this.publishFlowModal || this.publishFlowModal.isClosing) {
            this.publishOptions.resetPastScheduledAt();

            this.publishFlowModal = this.modals.open(PublishFlowModal, {
                publishOptions: this.publishOptions
            });
        }
    }
}
