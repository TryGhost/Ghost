import Component from '@glimmer/component';
import {action, get} from '@ember/object';
import {hasPublicPreview} from '../../utils/public-preview-warning';
import {later} from '@ember/runloop';
import {inject as service} from '@ember/service';

const ACCESS_OPTIONS = [
    {name: 'public', label: 'Public', description: 'Free for everyone to read'},
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
        return option ? option.label : 'Public';
    }

    // a divider on a public post does nothing — the actionable control is the
    // access selector, so it wears a highlight while that state holds
    get showAccessAttention() {
        return this.visibility === 'public' && this.hasPublicPreview;
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
        this._accessChanged = true;

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
        this._accessChanged = true;

        if (tiers?.length) {
            this.savePost();
        }
    }

    @action
    addPublicPreview() {
        this.args.editorAPI?.insertPaywall();
        this._resurfaceDividerPanel();
    }

    @action
    registerDropdownAPI(dropdownAPI) {
        this._dropdownAPI = dropdownAPI;
    }

    // resurface only once the menu closes — popping the divider panel up while
    // the user is still inside the access menu was disorienting
    @action
    onAccessMenuClose() {
        if (!this._accessChanged) {
            return;
        }

        this._accessChanged = false;

        if (this.isGated) {
            this._resurfaceDividerPanel();
        }
    }

    // access changes shape what the divider means, so its settings panel comes
    // back into view after access changes and on divider insert
    _resurfaceDividerPanel() {
        later(() => {
            if (!this.hasPublicPreview) {
                return;
            }

            this.args.editorAPI?.selectPaywall?.();
            this.scrollToPreviewDivider();
        }, 120);
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
