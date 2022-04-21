import Component from '@glimmer/component';
import moment from 'moment';
import {action} from '@ember/object';
import {isEmpty} from '@ember/utils';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class GhPublishMenuDraftComponent extends Component {
    @service config;
    @service feature;
    @service session;
    @service settings;
    @service store;

    @tracked totalMemberCount = null;

    // used to set minDate in datepicker
    _minDate = null;
    _publishedAtBlogTZ = null;

    get disableEmailOption() {
        // TODO: remove owner or admin check when editors can count members
        return this.session.user.isAdmin && (this.totalMemberCount === 0);
    }

    get showEmailSection() {
        return this.args.canSendEmail && this.args.distributionAction !== 'publish';
    }

    constructor() {
        super(...arguments);
        this.args.post.set('publishedAtBlogTZ', this.args.post.publishedAtUTC);

        this._updateDatesForSaveType(this.args.saveType);
    }

    @action
    setSaveType(type) {
        if (this.args.saveType !== type) {
            this._updateDatesForSaveType(type);
            this.args.setSaveType(type);
            this.args.post.validate();
        }
    }

    @action
    setDistributionAction(type) {
        this.args.setDistributionAction(type);
    }

    @action
    setDate(date) {
        let post = this.args.post;
        let dateString = moment(date).format('YYYY-MM-DD');

        post.set('publishedAtBlogDate', dateString);
        return post.validate();
    }

    @action
    setTime(time) {
        let post = this.args.post;

        post.set('publishedAtBlogTime', time);
        return post.validate();
    }

    // the date-time-picker component has it's own error handling for
    // invalid date and times but in this case we want the values to make it
    // to the model to make that invalid
    @action
    dateInputDidError(date) {
        this.setDate(date);
    }

    @action
    timeInputDidError(time) {
        this.setTime(time);
    }

    @task
    *countTotalMembersTask() {
        const user = yield this.session.user;

        if (user.isAdmin) {
            const result = yield this.store.query('member', {limit: 1, filter: 'newsletters.status:active'});
            this.totalMemberCount = result.meta.pagination.total;
        }
    }

    _updateDatesForSaveType(type) {
        let hasDateError = !isEmpty(this.args.post.errors.errorsFor('publishedAtBlogDate'));
        let hasTimeError = !isEmpty(this.args.post.errors.errorsFor('publishedAtBlogTime'));

        let minDate = this._getMinDate();
        this._minDate = minDate;

        // when publish: switch to now to avoid validation errors
        // when schedule: switch to last valid or new minimum scheduled date
        if (type === 'publish') {
            if (!hasDateError && !hasTimeError) {
                this._publishedAtBlogTZ = this.args.post.publishedAtBlogTZ;
            } else {
                this._publishedAtBlogTZ = this.args.post.publishedAtUTC;
            }

            this.args.post.set('publishedAtBlogTZ', this.args.post.publishedAtUTC);
        } else {
            if (!this._publishedAtBlogTZ || moment(this._publishedAtBlogTZ).isBefore(minDate)) {
                this.args.post.set('publishedAtBlogTZ', minDate);
            } else {
                this.args.post.set('publishedAtBlogTZ', this._publishedAtBlogTZ);
            }
        }
    }

    // API only accepts dates at least 2 mins in the future, default the
    // scheduled date 5 mins in the future to avoid immediate validation errors
    _getMinDate() {
        return moment.utc().add(5, 'minutes');
    }
}
