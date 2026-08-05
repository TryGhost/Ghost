import Component from '@glimmer/component';
import {action, get} from '@ember/object';
import {hasPublicPreview} from '../../utils/public-preview-warning';
import {inject as service} from '@ember/service';

const ACCESS_OPTIONS = [
    {name: 'public', label: 'Everyone', description: 'Free for everyone to read'},
    {name: 'members', label: 'Members only', description: 'Requires a free account'},
    {name: 'paid', label: 'Paid members only', description: 'Requires a paid subscription'},
    {name: 'tiers', label: 'Specific tiers', description: 'Requires one of the selected tiers'}
];

export default class AccessBarComponent extends Component {
    @service session;
    @service settings;

    accessOptions = ACCESS_OPTIONS;

    get post() {
        return this.args.post;
    }

    get canManageAccess() {
        const user = this.session.user;
        return user?.isOwnerOnly || user?.isAdminOnly || user?.isEitherEditor;
    }

    get visibility() {
        return this.post.visibility || this.settings.defaultContentVisibility;
    }

    get isGated() {
        return this.visibility !== 'public';
    }

    get accessLabel() {
        if (this.visibility === 'tiers') {
            const names = (this.post.tiers || []).map(tier => tier.name).filter(Boolean);

            if (names.length > 0 && names.length <= 2) {
                return `${names.join(' & ')} only`;
            }

            return 'Specific tiers only';
        }

        const option = ACCESS_OPTIONS.find(o => o.name === this.visibility);
        return option ? option.label : 'Everyone';
    }

    get hasPublicPreview() {
        // lexicalScratch is a plain property on the classic post model — native
        // access doesn't consume its tag, so read it via `get` to make this
        // getter invalidate when the editor content changes
        get(this.post, 'lexicalScratch');
        get(this.post, 'lexical');
        return hasPublicPreview(this.post);
    }

    @action
    setVisibility(name, dropdown) {
        if (name === this.visibility && name !== 'tiers') {
            dropdown?.actions?.close();
            return;
        }

        this.post.set('visibility', name);

        if (name === 'tiers') {
            // keep the menu open so the tier picker can be used; saving happens
            // once at least one tier is selected
            return;
        }

        this.post.set('tiers', []);
        dropdown?.actions?.close();
        this.savePost();
    }

    @action
    setTiers(tiers) {
        this.post.set('tiers', tiers);

        if (tiers?.length) {
            this.savePost();
        }
    }

    @action
    addPublicPreview() {
        this.args.editorAPI?.insertPaywall();
    }

    @action
    scrollToPreviewDivider() {
        const divider = document.querySelector('[data-kg-card="paywall"]');
        divider?.scrollIntoView({behavior: 'smooth', block: 'center'});
    }

    savePost() {
        return this.args.savePostTask?.perform().catch((error) => {
            if (error === undefined) {
                // validation error
                return;
            }

            throw error;
        });
    }
}
