import Component from '@glimmer/component';
import moment from 'moment-timezone';
import {action} from '@ember/object';
import {getPreviewEmailSegments, hasPublicPreview} from 'ghost-admin/utils/public-preview-warning';
import {groupTiersByActive} from 'ghost-admin/utils/group-tiers';
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

    get hasDivider() {
        return hasPublicPreview(this.post);
    }

    get previewSegments() {
        return this.hasDivider ? getPreviewEmailSegments(this.post) : '';
    }

    get previewEmailed() {
        return this.hasSplit && this.previewSegments !== '';
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

        return this.hasDivider ? `${access} · Free preview` : access;
    }

    _formatTierList(names) {
        if (names.length === 1) {
            return names[0];
        }

        if (names.length === 2) {
            return `${names[0]} and ${names[1]}`;
        }

        const rest = names.length - 2;
        return `${names[0]}, ${names[1]} and ${rest} more ${rest === 1 ? 'tier' : 'tiers'}`;
    }

    get notEmailedNoun() {
        return this.visibility === 'paid' ? 'free subscribers' : 'subscribers without access';
    }

    // default state on a gated post without an emailed preview: the derived
    // audience quietly excludes people, which the line must say out loud
    get showNotEmailedNote() {
        return !this.customising && this.hasSplit && !this.previewEmailed;
    }

    get otherOutcomeLabel() {
        // a divider always truncates the email for recipients without access;
        // without one, everyone on the list receives the whole thing
        return this.hasDivider ? 'get the free preview' : 'also get the full post';
    }

    // a gated post with no divider sends everyone on the list the full
    // content; stated as a plain consequence, never as mechanics
    get warnUngated() {
        return this.customising && this.hasSplit && !this.hasDivider;
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

    // ---- customise state ----------------------------------------------------

    get customising() {
        return this.publishOptions.selectedRecipientFilter !== undefined;
    }

    get selectedSegments() {
        const filter = this.publishOptions.selectedRecipientFilter;

        if (filter === undefined || filter === null) {
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

    @tracked audiencePickerOpen = false;

    @action
    toggleAudiencePicker() {
        if (!this.audiencePickerOpen && this.publishOptions.selectedRecipientFilter === undefined) {
            // preseed with the chips the derived default was already
            // selecting in the background — editing starts from the truth
            this.publishOptions.setRecipientFilter(this.publishOptions.defaultRecipientFilter);
        }

        this.audiencePickerOpen = !this.audiencePickerOpen;
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

    @tracked whenMenuOpen = false;

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
        this.whenMenuOpen = !this.whenMenuOpen;
    }

    @action
    chooseNow() {
        this.publishOptions.toggleScheduled(false);
        this.whenMenuOpen = false;
    }

    @action
    chooseLater() {
        this.publishOptions.toggleScheduled(true);
        this.whenMenuOpen = false;
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
