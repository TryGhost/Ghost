import Component from '@glimmer/component';
import moment from 'moment';
import {action} from '@ember/object';
import {isEmpty} from '@ember/utils';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
import {tracked} from '@glimmer/tracking';

export default class GhPublishMenuDraftComponent extends Component {
    @service config;
    @service feature;
    @service session;
    @service settings;
    @service store;

    @tracked totalMemberCount = 0;

    // used to set minDate in datepicker
    _minDate = null;
    _publishedAtBlogTZ = null;

    get disableEmailOption() {
        // TODO: remove owner or admin check when editors can count members
        return this.session.user.isAdmin && (this.totalMemberCount === 0 || this.countTotalMembersTask.isRunning);
    }

    get nextActionName() {
        return this.args.post.get('emailOnly') ? 'send' : 'publish';
    }

    constructor() {
        super(...arguments);
        this.args.post.set('publishedAtBlogTZ', this.args.post.publishedAtUTC);
    }

    @action
    setSaveType(type) {
        if (this.args.saveType !== type) {
            let hasDateError = !isEmpty(this.args.post.errors.errorsFor('publishedAtBlogDate'));
            let hasTimeError = !isEmpty(this.args.post.errors.errorsFor('publishedAtBlogTime'));
            let minDate = this._getMinDate();

            this._minDate = minDate;
            this.args.setSaveType(type);

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

            this.args.post.validate();
        }
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

    @task
    *countTotalMembersTask() {
        const user = yield this.session.user;

        if (user.isAdmin) {
            const result = yield this.store.query('member', {limit: 1, filter: 'subscribed:true'});
            this.totalMemberCount = result.meta.pagination.total;
        }
    }

    // API only accepts dates at least 2 mins in the future, default the
    // scheduled date 5 mins in the future to avoid immediate validation errors
    _getMinDate() {
        return moment.utc().add(5, 'minutes');
    }
}
