import Component from '@glimmer/component';
import {action} from '@ember/object';
import {canOfferFreePreview} from 'ghost-admin/utils/free-preview-offer';
import {groupTiersByActive} from 'ghost-admin/utils/group-tiers';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

// Public is the only level that isn't a gate, so it's the only one that isn't a
// padlock - a globe says "anyone" in a way a struck-through lock doesn't.
// Two names per level, one for each place a level is named. `chipLabel` is the
// answer the post is already showing, where the padlock beside it carries
// "only" and the noun is the whole of what's left to say. `menuLabel` is the
// same level as one of four being weighed against each other, where the extra
// word is what separates "Members" from "Paid".
// Which mount point each variant renders from. `sidebar` maps to nothing: that
// variant is the settings-drawer input, and neither chip renders for it.
const VARIANT_MOUNTS = {
    canvas: 'canvas',
    'canvas-menu': 'canvas',
    header: 'header',
    sidebar: null
};

const ACCESS_LEVELS = [
    {name: 'public', menuLabel: 'Public', chipLabel: 'Public', icon: 'lucide-globe'},
    {name: 'members', menuLabel: 'Members only', chipLabel: 'Members', icon: 'lucide-lock'},
    {name: 'paid', menuLabel: 'Paid members only', chipLabel: 'Paid', icon: 'lucide-lock'},
    {name: 'tiers', menuLabel: 'Specific tiers', chipLabel: 'Tiers', icon: 'lucide-lock'}
];

/**
 * The post's access, sitting on the post rather than in a drawer beside it.
 *
 * Access decides what the reader sees, so it belongs with the writing rather
 * than in a drawer beside it. The chip states the answer and nothing else: the
 * levels are only worth reading when the author is changing them, so they stay
 * behind the menu.
 *
 * Beside it sits the free preview, which is a second, separate decision -
 * gating a post says who gets in, and a preview says how much of it they can
 * read first. Neither one moves the other.
 *
 * Mounted twice - once over the top of the post, once in the breadcrumb row -
 * and the toggle picks which one renders. Every variant states the access the
 * same way. What varies is the preview offer, and it varies separately from
 * where the chip sits: `canvas` puts it beside the chip in words, while
 * `canvas-menu` and `header` fold it into the menu and mark it with a dot.
 */
export default class PostAccessChip extends Component {
    @service editorAccessPlacement;
    @service feature;
    @service session;
    @service settings;
    @service store;

    @tracked tiers = [];

    constructor() {
        super(...arguments);
        this.fetchTiersTask.perform();
    }

    // Gated here rather than at the call site: the chip renders from inside the
    // editor's content pane, which knows about the post but not about who is
    // editing it or which flags are on.
    get isVisible() {
        return this.feature.paywallV2
            && !this.session.user?.isContributor
            && this.isActivePlacement;
    }

    get post() {
        return this.args.post;
    }

    /**
     * Where this instance is mounted - `canvas` in the content pane, `header`
     * in the breadcrumb row. Both are always mounted; each renders only when
     * the selected variant lives there, so the chip never appears twice.
     */
    get placement() {
        return this.args.placement || 'canvas';
    }

    // the variant the toggle has selected, which is not the same question as
    // where this instance is mounted - two variants share the canvas mount
    get variant() {
        return this.editorAccessPlacement.placement;
    }

    get isActivePlacement() {
        return VARIANT_MOUNTS[this.variant] === this.placement;
    }

    get isHeader() {
        return this.variant === 'header';
    }

    /**
     * Where the free preview offer sits, which varies independently of where
     * the chip does. The original canvas variant has an empty row to itself and
     * puts the offer beside the chip in words; every other variant folds it
     * into the menu, either because the row is shared (header) or to find out
     * whether the canvas reads better without it.
     */
    get offerInMenu() {
        return this.variant !== 'canvas';
    }

    // an unset visibility means the post takes the site's default, which is
    // what the server applies on publish
    get visibility() {
        return this.post.visibility || this.settings.defaultContentVisibility;
    }

    get canAddFreePreview() {
        return canOfferFreePreview(this.post, this.visibility);
    }

    // the badge is the only place these appear - the menu is text alone
    get icon() {
        return ACCESS_LEVELS.find(level => level.name === this.visibility)?.icon
            || ACCESS_LEVELS[0].icon;
    }

    // the menu is the only consumer, so it gets the menu's copy as `label`
    get accessLevels() {
        return ACCESS_LEVELS.map(level => ({
            ...level,
            label: level.menuLabel,
            isSelected: level.name === this.visibility
        }));
    }

    /**
     * The chip's own copy, the same in both placements. It states an answer the
     * post already has, so it only needs the noun - the menu underneath is
     * where the levels are spelled out and compared.
     *
     * Tier-gated posts name the tier when there's one to name. "2 tiers" is
     * only useful as a count - by the time a post is on several, the list is
     * longer than the chip and the author opens the menu to read it anyway.
     */
    get label() {
        const level = ACCESS_LEVELS.find(l => l.name === this.visibility) || ACCESS_LEVELS[0];

        if (this.visibility !== 'tiers') {
            return level.chipLabel;
        }

        const selected = this.selectedTiers;

        if (selected.length === 1) {
            // the tier named bare. "Bronze only" spends a word restating the
            // padlock, and the tier's own name is the specific part
            return selected[0].name;
        }

        if (selected.length > 1) {
            return `${selected.length} tiers`;
        }

        return level.chipLabel;
    }

    get selectedTiers() {
        return this.post.tiers?.toArray?.() || this.post.tiers || [];
    }

    // Only used to seed the first tier when the author switches to tier-gating
    // - the picker itself fetches and renders its own options
    get activeTiers() {
        const [active] = groupTiersByActive(this.tiers);
        return active.options;
    }

    /**
     * Every level but tiers is the whole answer, so the menu closes on it.
     * Tiers isn't finished until a tier is picked and the picker is inside the
     * menu, so that one stays open until the author dismisses it themselves.
     *
     * Closed via the dropdown's own action rather than the `dropdown` service:
     * the service's `close` event leaves the content mounted, so every reopen
     * stacked another copy of the menu in the wormhole and clicks landed on a
     * stale one.
     */
    @action
    selectLevel(visibility, dropdown, event) {
        if (visibility === 'tiers') {
            // Belt and braces with the keyed `{{#each}}`: keep the click away
            // from the dropdown service's body listener entirely, so nothing
            // about how this button re-renders can close the menu the author
            // still needs.
            event?.stopPropagation();
            this.setVisibility(visibility);
            return;
        }

        this.setVisibility(visibility);
        dropdown?.actions?.close();
    }

    /**
     * In the header the offer lives inside the menu, so taking it up has to
     * shut the menu the same way picking a level does - the author is done
     * either way, and the card they just made is behind it.
     */
    @action
    addFreePreview(dropdown) {
        this.args.insertFreePreview?.();
        dropdown?.actions?.close();
    }

    @action
    setVisibility(visibility) {
        if (visibility === this.post.visibility) {
            return;
        }

        this.post.set('visibility', visibility);

        // Tiers are the only level that carries anything else, and the previous
        // selection means nothing at any other level
        if (visibility !== 'tiers') {
            this.post.set('tiers', []);
            this.savePost();
            return;
        }

        // "Specific tiers" with no tier is not a state the post can be saved
        // in - it fails validation - so choosing it starts on the first tier
        // and the picker that just opened underneath is where it's adjusted
        if (!this.selectedTiers.length) {
            const [first] = this.activeTiers;

            if (!first) {
                // no paid tiers to gate on yet; nothing to save either
                return;
            }

            this.post.set('tiers', [{id: first.id, slug: first.slug, name: first.name}]);
        }

        this.savePost();
    }

    // the picker hands back the full selection, already in the post's shape
    @action
    setTiers(tiers) {
        this.post.set('tiers', tiers);

        // Clearing every tier leaves the post gated on nothing, which won't
        // validate. It's held in the editor rather than saved and rejected -
        // the author is mid-edit, and the level list above is where "no tiers"
        // is actually expressed.
        if (tiers.length) {
            this.savePost();
        }
    }

    savePost() {
        // a post that has never been saved has nothing to update yet - the
        // value rides along with the first save
        if (this.post.isNew) {
            return;
        }

        // the task reports its own failures; catching here only stops the
        // rejection escaping as an unhandled one
        this.args.savePostTask?.perform().catch(() => {});
    }

    @task
    *fetchTiersTask() {
        const tiers = yield this.store.query('tier', {filter: 'type:paid', limit: 'all'});

        // the filter is the API's job, but a free tier gates nothing and the
        // store hands back whatever it already has cached
        this.tiers = tiers.filter(tier => tier.type === 'paid');
    }
}
