import PublishOptions from '../utils/publish-options';
import {Resource} from 'ember-could-get-used-to-this';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class PublishOptionsResource extends Resource {
    @service limit;
    @service session;
    @service settings;
    @service store;

    @inject config;

    @tracked publishOptions;

    get value() {
        return this.publishOptions;
    }

    setup() {
        const post = this.args.positional[0];
        this._post = post;

        this.publishOptions = this._createPublishOptions(post);
    }

    update() {
        // required due to a weird invalidation issue when using Ember Data with ember-could-get-used-to-this
        // TODO: re-test after upgrading to ember-resources
        const post = this.args.positional[0];
        if (post !== this._post) {
            this.publishOptions = this._createPublishOptions(post);
        }
    }

    _createPublishOptions(post) {
        const {config, limit, settings, store} = this;

        return new PublishOptions({
            config,
            limit,
            post,
            settings,
            store,
            user: this.session.user
        });
    }
}
