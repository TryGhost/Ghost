import Component from '@glimmer/component';
import {action} from '@ember/object';
import {canOfferFreePreview} from 'ghost-admin/utils/free-preview-offer';
import {inject as service} from '@ember/service';

/**
 * The free preview offer as a description under the sidebar's access input.
 *
 * The sidebar placement is the access control Ghost ships today, unchanged. The
 * only thing added is this: the offer had nowhere to live there, because the
 * drawer's access field is a field and not a chip with a menu behind it. A
 * description under the input is where a field explains itself, so that's where
 * the offer goes.
 */
export default class AccessPreviewHint extends Component {
    @service editorAccessPlacement;
    @service feature;
    @service settings;

    get post() {
        return this.args.post;
    }

    // an unset visibility means the post takes the site's default, which is
    // what the server applies on publish
    get visibility() {
        return this.post?.visibility || this.settings.defaultContentVisibility;
    }

    get isVisible() {
        return this.feature.paywallV2
            && this.editorAccessPlacement.isSidebar
            && canOfferFreePreview(this.post, this.visibility);
    }

    @action
    addFreePreview() {
        this.args.insertFreePreview?.();
    }
}
