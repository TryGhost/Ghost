import Component from '@glimmer/component';
import EmberObject from '@ember/object';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

const PostValidatorProxy = EmberObject.extend(ValidationEngine, {
    validationType: 'post',
    isNew: false, // required for our visibility and tiers validations to work

    visibility: tracked(),
    tiers: tracked()
});

export default class EditPostsAccessModal extends Component {
    @service store;
    @service settings;

    // We use a simulated post model to use the same validations as the post model without
    // putting any dummy records in the store and needing to force an "isNew: false" state
    @tracked post = PostValidatorProxy.create();

    get selectionList() {
        return this.args.data.selectionList;
    }

    @action
    setup() {
        if (this.selectionList.first && this.selectionList.isSingle) {
            this.post.visibility = this.selectionList.first.visibility;
            this.post.tiers = this.selectionList.first.tiers || [];
        } else {
            // Use default
            this.post.visibility = this.settings.defaultContentVisibility;
            this.post.tiers = this.settings.defaultContentVisibilityTiers.map((tier) => {
                return {
                    id: tier
                };
            });
        }
    }

    async validate() {
        await this.post.validate({property: 'visibility'});
        await this.post.validate({property: 'tiers'});
    }

    @action
    async setVisibility(segment) {
        this.post.tiers = segment;
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
