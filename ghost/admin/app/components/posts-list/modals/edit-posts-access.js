import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class EditPostsAccessModal extends Component {
    @service store;
    @service settings;

    // We createa new post model to use the same validations as the post model
    @tracked post = this.store.createRecord('post', {});

    get selectionList() {
        return this.args.data.selectionList;
    }

    @action
    setup() {
        if (this.selectionList.first && this.selectionList.isSingle) {
            this.post.set('visibility', this.selectionList.first.visibility);
            this.post.set('tiers', this.selectionList.first.tiers);
        } else {
            // Use default
            this.post.set('visibility', this.settings.defaultContentVisibility);
            this.post.set('tiers', this.settings.defaultContentVisibilityTiers.map((tier) => {
                return {
                    id: tier
                };
            }));
        }
    }

    async validate() {
        // Mark as not new
        this.post.set('currentState.parentState.isNew', false);
        await this.post.validate({property: 'visibility'});
        await this.post.validate({property: 'tiers'});
    }

    @action
    async setVisibility(segment) {
        this.post.set('tiers', segment);
        try {
            await this.validate();
        } catch (e) {
            if (!e) {
                // validation error
                return;
            }

            throw e;
        }
    }

    @task
    *save() {
        // First validate
        try {
            yield this.validate();
        } catch (e) {
            if (!e) {
                // validation error
                return;
            }
            throw e;
        }
        return yield this.args.data.confirm.perform(this.args.close, {
            visibility: this.post.visibility,
            tiers: this.post.tiers
        });
    }
}
