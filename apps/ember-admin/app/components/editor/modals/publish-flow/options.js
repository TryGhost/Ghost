import Component from '@glimmer/component';
import moment from 'moment-timezone';
import {action} from '@ember/object';
import {groupTiersByActive} from 'ghost-admin/utils/group-tiers';
import {hasPublicPreviewContent} from 'ghost-admin/utils/public-preview-warning';
import {isBlank} from '@ember/utils';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class PublishFlowOptions extends Component {
    @service feature;
    @service labelsManager;
    @service membersUtils;
    @service settings;
    @service store;

    // where-it-goes toggles; publishType only supports three states so an
    // all-off selection is prevented (with a visual nudge) instead
    @tracked webChecked = this.args.publishOptions.publishType !== 'send';
    @tracked emailChecked = this.args.publishOptions.publishType !== 'publish';

    @tracked _tierOptions = [];

    constructor() {
        super(...arguments);
        this.fetchTierOptionsTask.perform();
    }

    get publishOptions() {
        return this.args.publishOptions;
    }

    get post() {
        return this.publishOptions.post;
    }

    get emailActive() {
        return this.emailChecked && !this.publishOptions.emailUnavailable && !this.publishOptions.emailDisabled;
    }

    // a greyed switch must say why — the reasons production states
    get emailDisabledReason() {
        const options = this.publishOptions;

        if (!options.emailDisabled) {
            return null;
        }

        if (options.emailDisabledError) {
            return options.emailDisabledError;
        }

        if (!options.mailgunIsConfigured) {
            return 'Set up Mailgun to start sending newsletters';
        }

        if (options.totalMemberCount === 0) {
            return 'Add members to start sending newsletters';
        }

        return null;
    }

    // ---- derived audience facts --------------------------------------------

    get visibility() {
        return this.post.visibility || 'public';
    }

    // only paid/tiers posts split email recipients into full post vs preview
    get hasSplit() {
        return this.visibility === 'paid' || this.visibility === 'tiers';
    }

    // the divider at the top means nothing is previewed; a preview only
    // exists (and shapes copy + audiences) once content sits above it
    get hasPreview() {
        return hasPublicPreviewContent(this.post);
    }

    get tierSlugs() {
        return (this.post.tiers || []).map(tier => tier.slug).filter(Boolean);
    }

    get accessFilter() {
        if (this.visibility === 'paid') {
            return 'status:-free';
        }

        if (this.visibility === 'tiers') {
            return this.tierSlugs.length ? this.tierSlugs.map(slug => `tier:${slug}`).join(',') : null;
        }

        return null;
    }

    get noAccessFilter() {
        if (this.visibility === 'paid') {
            return 'status:free';
        }

        if (this.visibility === 'tiers') {
            return this.tierSlugs.length ? this.tierSlugs.map(slug => `tier:-${slug}`).join('+') : null;
        }

        return null;
    }

    // ---- per-row status lines ----------------------------------------------

    // states the post's access in the editor's own vocabulary (access bar +
    // divider pill); public posts need no line
    get webLine() {
        if (this.visibility === 'public') {
            return null;
        }

        let access;

        if (this.visibility === 'paid') {
            access = 'Paid members only';
        } else if (this.visibility === 'tiers') {
            const names = (this.post.tiers || []).map(tier => tier.name).filter(Boolean);
            access = names.length ? `${this._formatTierList(names)} only` : 'Specific tiers only';
        } else {
            access = 'Members only';
        }

        return this.hasPreview ? `${access} · Free preview` : access;
    }

    // every tier is named — the reader must be able to see exactly who has
    // access without opening anything
    _formatTierList(names) {
        if (names.length === 1) {
            return names[0];
        }

        return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
    }

    get notEmailedNoun() {
        return this.visibility === 'paid' ? 'free subscribers' : 'subscribers without access';
    }

    // when the send list excludes everyone without access, the exclusion is
    // silent arithmetic — this names it, acknowledging an unsent preview
    get notEmailedNote() {
        if (this.hasPreview) {
            return 'the free preview isn\u2019t emailed';
        }

        return `${this.notEmailedNoun} aren\u2019t emailed`;
    }

    get otherOutcomeLabel() {
        return this.hasPreview ? 'get the free preview' : null;
    }

    // on a locked post everyone on the list is still emailed — without-access
    // recipients get exactly what the web shows them (title, image, upgrade
    // CTA), unless this post's email explicitly bypasses the divider
    get lockedOutcomeLabel() {
        return this.post.emailFullPost ? 'get the full post too' : 'get the title & image only';
    }

    @action
    toggleLockedOutcomeMenu() {
        this.openMenu = this.openMenu === 'locked-outcome' ? null : 'locked-outcome';
    }

    @action
    chooseLockedOutcome(fullPost) {
        this.post.set('emailFullPost', fullPost);
        this.openMenu = null;
    }



    get fullNoun() {
        if (this.visibility === 'paid') {
            return 'paid members';
        }

        return 'members with access';
    }

    // ---- count filters ------------------------------------------------------

    get baseFilter() {
        return this.publishOptions.newsletter?.recipientFilter;
    }

    get sendFilter() {
        return this.publishOptions.recipientFilter;
    }

    get totalCountFilter() {
        const send = this.sendFilter ? `+(${this.sendFilter})` : '';
        return `${this.baseFilter}${send}`;
    }

    get fullCountFilter() {
        const access = (this.hasSplit && this.accessFilter) ? `+(${this.accessFilter})` : '';
        return `${this.totalCountFilter}${access}`;
    }

    get otherCountFilter() {
        if (!this.hasSplit || !this.noAccessFilter) {
            return null;
        }

        return `${this.totalCountFilter}+(${this.noAccessFilter})`;
    }

    get fullyLocked() {
        return this.hasSplit && !this.hasPreview;
    }





    // ---- customise state ----------------------------------------------------

    get customising() {
        return this.publishOptions.selectedRecipientFilter !== undefined;
    }

    get selectedSegments() {
        // chips always show the effective list — a site-default "specific"
        // filter renders as chips even before the publisher touches anything
        const filter = this.publishOptions.selectedRecipientFilter ?? this.publishOptions.recipientFilter;

        if (!filter) {
            return [];
        }

        return filter.split(',').reject(isBlank);
    }

    get nonLabelOptions() {
        const memberOptions = [{name: 'Free members', segment: 'status:free', class: 'segment-status'}];

        if (this.membersUtils.isStripeEnabled) {
            memberOptions.push({name: 'Paid members', segment: 'status:-free', class: 'segment-status'});
        }

        return [{groupName: 'Members', options: memberOptions}, ...this._tierOptions];
    }

    @task
    *fetchTierOptionsTask() {
        const tiers = yield this.store.query('tier', {filter: 'type:paid', limit: 'all'});

        if (tiers.length > 1) {
            const [activeTiersGroup, archivedTiersGroup] = groupTiersByActive(tiers, tier => ({
                name: tier.name,
                segment: `tier:${tier.slug}`,
                count: tier.count?.members,
                class: 'segment-tier'
            }));

            this._tierOptions = [activeTiersGroup, archivedTiersGroup];
        }
    }

    // ---- actions ------------------------------------------------------------

    @action
    toggleWeb(event) {
        // a post must go out on at least one medium; the kept-on row flashes
        // so the refused click has a visible cause
        if (!event.target.checked && !this.emailActive) {
            event.target.checked = true;
            this._flashRow('publish-email');
            return;
        }

        this.webChecked = event.target.checked;
        this._syncPublishType();
    }

    @action
    toggleEmail(event) {
        if (!event.target.checked && !this.webChecked) {
            event.target.checked = true;
            this._flashRow('publish-web');
            return;
        }

        this.emailChecked = event.target.checked;
        this._syncPublishType();
    }

    // ---- audience menu -------------------------------------------------------
    // one trigger, three named audiences; chips exist only behind "Specific
    // people" — the same choice-menu pattern as the "Right now" row

    // one sentence-menu at a time: 'audience' | 'newsletter' | 'when' | null
    @tracked openMenu = null;
    @tracked audiencePickerOpen = false;

    // "Specific people" is a mode, and a mode's detail control lives under the
    // row for as long as the mode holds (the schedule picker pattern) — the
    // chips also appear straight away when a site default lands here
    get showAudiencePicker() {
        return this.audiencePickerOpen || this.audienceChoice === 'specific';
    }

    get allAudienceFilter() {
        return 'status:free,status:-free';
    }

    // recipients who can read the post; null when access doesn't narrow the
    // audience (public/members posts — every subscriber can read those)
    get accessAudienceFilter() {
        if (this.visibility === 'paid') {
            return 'status:-free';
        }

        if (this.visibility === 'tiers') {
            return this.post.visibilitySegment || null;
        }

        return null;
    }

    _normalizeFilter(filter) {
        return (filter || '').split(',').map(part => part.trim()).reject(isBlank).sort().join(',');
    }

    get audienceChoice() {
        const current = this._normalizeFilter(this.publishOptions.recipientFilter);

        if (current === this._normalizeFilter(this.allAudienceFilter)) {
            return 'all';
        }

        if (this.accessAudienceFilter && current === this._normalizeFilter(this.accessAudienceFilter)) {
            return 'access';
        }

        return 'specific';
    }

    @action
    toggleAudienceMenu() {
        this.openMenu = this.openMenu === 'audience' ? null : 'audience';
    }

    @action
    toggleNewsletterMenu() {
        this.openMenu = this.openMenu === 'newsletter' ? null : 'newsletter';
    }

    @action
    chooseNewsletter(newsletter) {
        this.publishOptions.setNewsletter(newsletter);
        this.openMenu = null;
    }

    @action
    chooseAllAudience() {
        this.publishOptions.setRecipientFilter(this.allAudienceFilter);
        this.openMenu = null;
        this.audiencePickerOpen = false;
    }

    @action
    chooseAccessAudience() {
        this.publishOptions.setRecipientFilter(this.accessAudienceFilter);
        this.openMenu = null;
        this.audiencePickerOpen = false;
    }

    @action
    chooseSpecificAudience() {
        if (this.publishOptions.selectedRecipientFilter === undefined) {
            // preseed with the chips the derived default was already
            // selecting in the background — editing starts from the truth
            this.publishOptions.setRecipientFilter(this.publishOptions.defaultRecipientFilter);
        }

        this.openMenu = null;
        this.audiencePickerOpen = true;
    }

    @action
    selectSegments(selectedOptions) {
        const segments = selectedOptions.map(option => option.segment);

        // an emptied selection means "no email" — flip the switch rather than
        // blocking the CTA over a state the copy already declares valid
        if (segments.length === 0) {
            this.publishOptions.setRecipientFilter(undefined);
            this.emailChecked = false;

            if (!this.webChecked) {
                this.webChecked = true;
            }

            this.audiencePickerOpen = false;
            this._syncPublishType();
            return;
        }

        this.publishOptions.setRecipientFilter(segments.join(','));
    }

    // ---- when ---------------------------------------------------------------

    get scheduledLabel() {
        const at = moment.tz(this.publishOptions.scheduledAtUTC, this.settings.timezone);
        return at.format('dddd D MMM YYYY [at] HH:mm');
    }

    // production's phrasing: the human-scale distance, not the timestamp
    get relativeScheduleLabel() {
        return moment(this.publishOptions.scheduledAtUTC).fromNow();
    }

    @action
    toggleWhenMenu() {
        this.openMenu = this.openMenu === 'when' ? null : 'when';
    }

    @action
    chooseNow() {
        this.publishOptions.toggleScheduled(false);
        this.openMenu = null;
    }

    @action
    chooseLater() {
        this.publishOptions.toggleScheduled(true);
        this.openMenu = null;
    }

    @action
    setDate(selectedDate) {
        // touching the date IS choosing to schedule
        if (!this.publishOptions.isScheduled) {
            this.publishOptions.toggleScheduled(true);
        }

        const selectedMoment = moment.tz(selectedDate, this.settings.timezone);
        const {years, months, date} = selectedMoment.toObject();

        const newDate = moment.tz(
            this.publishOptions.scheduledAtUTC,
            this.settings.timezone
        );
        newDate.set({years, months, date});

        this.publishOptions.setScheduledAt(newDate);
    }

    @action
    setTime(time, event) {
        if (!this.publishOptions.isScheduled) {
            this.publishOptions.toggleScheduled(true);
        }

        const newDate = moment.tz(this.publishOptions.scheduledAtUTC, this.settings.timezone);
        const oldTime = newDate.format('HH:mm');

        if (!time) {
            event.target.value = oldTime;
            return;
        }

        if (time.match(/^\d:\d\d$/)) {
            time = `0${time}`;
        }

        if (!time.match(/^\d\d:\d\d$/)) {
            event.target.value = oldTime;
            return;
        }

        const [hour, minute] = time.split(':').map(n => parseInt(n, 10));

        if (isNaN(hour) || hour < 0 || hour > 23 || isNaN(minute) || minute < 0 || minute > 59) {
            event.target.value = oldTime;
            return;
        }

        newDate.set({hour, minute});
        this.publishOptions.setScheduledAt(newDate);
    }

    // ---- internals ----------------------------------------------------------

    _flashRow(name) {
        const row = document.querySelector(`[data-test-setting="${name}"]`);

        if (!row) {
            return;
        }

        row.classList.add('gh-pubflow-row-flash');
        setTimeout(() => row.classList.remove('gh-pubflow-row-flash'), 900);
    }

    _syncPublishType() {
        const {webChecked, emailChecked} = this;

        if (webChecked && emailChecked) {
            this.publishOptions.setPublishType('publish+send');
        } else if (webChecked) {
            this.publishOptions.setPublishType('publish');
        } else if (emailChecked) {
            this.publishOptions.setPublishType('send');
        }
    }
}
