import Component from '@glimmer/component';
import {action, get} from '@ember/object';
import {cancel, later} from '@ember/runloop';
import {hasPublicPreview} from '../../utils/public-preview-warning';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

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

    // the change-announcement: quiet at rest, one loud beat on the
    // transition that matters, then gone
    @tracked announcement = null;

    // the pill speaks in full while the reader is orienting (top of the
    // document) or right after a change; it whispers while they write
    @tracked atTop = true;
    @tracked recentlyChanged = false;

    get pillExpanded() {
        return this.atTop || this.recentlyChanged;
    }

    constructor() {
        super(...arguments);
        this._hadWall = this.hasPublicPreview;
    }

    willDestroy() {
        super.willDestroy(...arguments);
        cancel(this._announceTimer);
        cancel(this._changedTimer);
        this._scrollTarget?.removeEventListener('scroll', this._onScroll);
    }

    @action
    setupScrollTracking(element) {
        this._scrollTarget = element.closest('.gh-editor')?.querySelector('.gh-editor-container') || null;

        if (!this._scrollTarget) {
            return;
        }

        this._onScroll = () => {
            this.atTop = this._scrollTarget.scrollTop < 80;
        };
        this._scrollTarget.addEventListener('scroll', this._onScroll, {passive: true});
        this._onScroll();
    }

    _flashChanged() {
        cancel(this._changedTimer);
        this.recentlyChanged = true;
        this._changedTimer = later(() => {
            this.recentlyChanged = false;
        }, 2500);
    }

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

            if (names.length === 0) {
                return 'Specific tiers only';
            }

            if (names.length === 1) {
                return `${names[0]} only`;
            }

            // every tier is named — the label states exactly who has access
            return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} only`;
        }

        const option = ACCESS_OPTIONS.find(o => o.name === this.visibility);
        return option ? option.label : 'Public';
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
            // the wall rises as soon as the post is gated; saving waits for
            // the tier picker (menu stays open) but the gate is already real
            this._syncWall();
            return;
        }

        this.post.set('tiers', []);
        dropdown?.actions?.close();
        this._syncWall();
        this._flashChanged();
        this.savePost();
    }

    @action
    setTiers(tiers) {
        this.post.set('tiers', tiers);

        if (tiers?.length) {
            this._syncWall();
            this._flashChanged();
            this.savePost();
        }
    }

    @action
    registerDropdownAPI(dropdownAPI) {
        this._dropdownAPI = dropdownAPI;
    }

    // the wall IS the gate, in both directions: deleting the divider sets the
    // post back to public. Only a true->false transition counts, so the
    // deferred auto-insert on gating never trips this. The change announces
    // itself from the pill — with a way back that restores both the gating
    // and the wall
    @action
    onWallPresenceChange() {
        const has = this.hasPublicPreview;
        const had = this._hadWall;
        this._hadWall = has;

        if (had && !has && this.isGated) {
            const previous = {
                visibility: this.post.visibility,
                tiers: (this.post.tiers || []).slice()
            };

            this.post.set('visibility', 'public');
            this.post.set('tiers', []);
            this.savePost();

            cancel(this._announceTimer);
            this.announcement = {previous};
            this._announceTimer = later(() => {
                this.announcement = null;
            }, 4200);
        }
    }

    @action
    undoUngate() {
        const previous = this.announcement?.previous;

        cancel(this._announceTimer);
        this.announcement = null;

        if (!previous) {
            return;
        }

        this.post.set('visibility', previous.visibility);
        this.post.set('tiers', previous.tiers);
        // the wall returns at the top (its exact position isn't recorded);
        // mark it present so the observer doesn't re-fire on the insert
        this._hadWall = true;
        this.args.editorAPI?.insertPaywallAtTop?.();
        this.savePost();
    }

    // the wall is the gate made visible: gating raises it at the top of the
    // document (nothing previewed until the writer moves it down), going
    // public removes it — the concept only exists while the post is gated
    _syncWall() {
        later(() => {
            if (this.isGated && !this.hasPublicPreview) {
                this.args.editorAPI?.insertPaywallAtTop?.();
            } else if (!this.isGated && this.hasPublicPreview) {
                this.args.editorAPI?.removePaywall?.();
            }
        }, 50);
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
