import Component from '@glimmer/component';
import moment from 'moment';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class GhPublishmenuScheduledComponent extends Component {
    @service clock;
    @service session;
    @service feature;
    @service settings;
    @service config;

    // used to set minDate in datepicker
    @tracked minDate = null;

    get timeToPublished() {
        let publishedAtUTC = this.args.post.publishedAtUTC;

        if (!publishedAtUTC) {
            return null;
        }

        this.clock.get('second');

        return publishedAtUTC.toNow(true);
    }

    constructor() {
        super(...arguments);
        this.minDate = new Date();
    }

    @action
    setSaveType(type) {
        if (this.saveType !== type) {
            this.minDate = new Date();
            this.args.setSaveType(type);

            // when draft switch to now to avoid validation errors
            // when schedule switch back to saved date to avoid unnecessary re-scheduling
            if (type === 'draft') {
                this.args.post.set('publishedAtBlogTZ', new Date());
            } else {
                this.args.post.set('publishedAtBlogTZ', this.args.post.publishedAtUTC);
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

        if (!this.args.isClosing) {
            post.set('publishedAtBlogTime', time);
            return post.validate();
        }
    }
}
