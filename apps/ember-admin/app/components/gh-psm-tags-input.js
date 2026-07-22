import Component from '@glimmer/component';
import {action} from '@ember/object';

export default class GhPsmTagsInput extends Component {
    @action
    updateTags(newTags) {
        // update tags on the post
        this.args.post.set('tags', newTags);

        // save post if configured to do so
        if (this.args.savePostOnChange) {
            return this.args.savePostOnChange();
        }
    }

    @action
    createTag(tagToAdd) {
        // push tag onto post relationship
        return this.args.post.get('tags').pushObject(tagToAdd);
    }
}
