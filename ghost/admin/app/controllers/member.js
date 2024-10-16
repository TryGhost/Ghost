import Controller, {inject as controller} from '@ember/controller';
import DeleteMemberModal from '../components/members/modals/delete-member';
import EmberObject, {action, defineProperty} from '@ember/object';
import LogoutMemberModal from '../components/members/modals/logout-member';
import boundOneWay from 'ghost-admin/utils/bound-one-way';
import moment from 'moment-timezone';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

const SCRATCH_PROPS = ['name', 'email', 'note'];

export default class MemberController extends Controller {
    @controller members;
    @service session;
    @service dropdown;
    @service membersStats;
    @service membersCountCache;
    @service modals;
    @service notifications;
    @service router;
    @service store;

    queryParams = [
        {postAnalytics: 'post'}
    ];

    @tracked isLoading = false;
    @tracked showImpersonateMemberModal = false;
    @tracked modalLabel = null;
    @tracked showLabelModal = false;

    _previousLabels = null;
    _previousNewsletters = null;

    @tracked directlyFromAnalytics = false;
    @tracked postAnalytics = null;

    get fromAnalytics() {
        if (!this.postAnalytics) {
            return null;
        }
        return [this.postAnalytics];
    }

    constructor() {
        super(...arguments);
        this._availableLabels = this.store.peekAll('label');
    }

    // Computed properties -----------------------------------------------------

    get member() {
        return this.model;
    }

    set member(member) {
        this.model = member;
    }

    get dirtyAttributes() {
        return this._hasDirtyAttributes();
    }

    get _labels() {
        return this.member.get('labels').map(label => label.name);
    }

    get _newsletters() {
        return this.member.get('newsletters').map(newsletter => newsletter.id);
    }

    get labelModalData() {
        let label = this.modalLabel;
        let labels = this.availableLabels;

        return {
            label,
            labels
        };
    }

    get availableLabels() {
        let labels = this._availableLabels
            .filter(label => !label.isNew)
            .filter(label => label.id !== null)
            .sort((labelA, labelB) => labelA.name.localeCompare(labelB.name, undefined, {ignorePunctuation: true}));
        let options = labels.toArray();

        options.unshiftObject({name: 'All labels', slug: null});

        return options;
    }

    get scratchMember() {
        let scratchMember = EmberObject.create({member: this.member});
        SCRATCH_PROPS.forEach(prop => defineProperty(scratchMember, prop, boundOneWay(`member.${prop}`)));
        return scratchMember;
    }

    get subscribedAt() {
        let memberSince = moment(this.member.createdAtUTC).from(moment());
        let createdDate = moment(this.member.createdAtUTC).format('D MMM YYYY');
        return `${createdDate} (${memberSince})`;
    }

    // Actions -----------------------------------------------------------------

    @action
    setInitialRelationshipValues() {
        this._previousLabels = this._labels;
        this._previousNewsletters = this._newsletters;
    }

    @action
    toggleLabelModal() {
        this.showLabelModal = !this.showLabelModal;
    }

    @action
    editLabel(label, e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        let modalLabel = this.availableLabels.findBy('slug', label);
        this.modalLabel = modalLabel;
        this.showLabelModal = !this.showLabelModal;
    }

    @action
    setProperty(propKey, value) {
        this._saveMemberProperty(propKey, value);
    }

    @action
    confirmDeleteMember() {
        this.modals.open(DeleteMemberModal, {
            member: this.member,
            afterDelete: () => {
                this.membersStats.invalidate();
                this.members.refreshData();
                this.membersCountCache.clear();
                this.transitionToRoute('members');
            }
        });
    }

    @action
    confirmLogoutMember() {
        this.modals.open(LogoutMemberModal, {
            member: this.member,
            afterLogout: () => {
                this.members.refreshData();
            }
        });
    }

    @action
    toggleImpersonateMemberModal() {
        this.showImpersonateMemberModal = !this.showImpersonateMemberModal;
    }

    @action
    closeImpersonateMemberModal() {
        this.showImpersonateMemberModal = false;
    }

    @action
    save() {
        return this.saveTask.perform();
    }

    // Tasks -------------------------------------------------------------------

    @task({drop: true})
    *saveTask() {
        let {member, scratchMember} = this;

        // if Cmd+S is pressed before the field loses focus make sure we're
        // saving the intended property values
        let scratchProps = scratchMember.getProperties(SCRATCH_PROPS);
        Object.assign(member, scratchProps);

        try {
            const clearCountCache = member.isNew; // clear cache for adding new members so the count is updated without waiting for a refresh

            yield member.save();
            member.updateLabels();
            this.members.refreshData();

            this.setInitialRelationshipValues();

            if (clearCountCache) {
                this.membersCountCache.clear();
            }

            // replace 'member.new' route with 'member' route
            this.replaceRoute('member', member);

            return member;
        } catch (error) {
            if (error === undefined) {
                // Validation error
                return;
            }

            if (error.payload && error.payload.errors) {
                for (const payloadError of error.payload.errors) {
                    if (payloadError.type === 'ValidationError' && payloadError.property && (payloadError.context || payloadError.message)) {
                        member.errors.add(payloadError.property, payloadError.context || payloadError.message);
                        member.hasValidated.pushObject(payloadError.property);
                    }
                }
                return;
            }

            throw error;
        }
    }

    @task
    *fetchMemberTask(memberId) {
        this.isLoading = true;

        this.member = yield this.store.queryRecord('member', {
            id: memberId,
            include: 'tiers'
        });

        this.setInitialRelationshipValues();

        this.isLoading = false;
    }

    // Private -----------------------------------------------------------------

    _saveMemberProperty(propKey, newValue) {
        let currentValue = this.member[propKey];

        if (newValue && typeof newValue === 'string') {
            newValue = newValue.trim();
        }

        // avoid modifying empty values and triggering inadvertant unsaved changes modals
        if (newValue !== false && !newValue && !currentValue) {
            return;
        }

        this.member[propKey] = newValue;
    }

    _hasDirtyAttributes() {
        let member = this.member;

        if (!member || member.isDeleted || member.isDeleting) {
            return false;
        }

        // member.labels is an array so hasDirtyAttributes doesn't pick up
        // changes unless the array ref is changed.
        // use sort() to sort of detect same item is re-added
        let currentLabels = (this._labels.sort() || []).join(', ');
        let previousLabels = (this._previousLabels.sort() || []).join(', ');
        if (currentLabels !== previousLabels) {
            return true;
        }

        // member.newsletters is an array so hasDirtyAttributes doesn't pick up
        // changes unless the array ref is changed
        // use sort() to sort of detect same item is re-enabled
        let currentNewsletters = (this._newsletters.sort() || []).join(', ');
        let previousNewsletters = (this._previousNewsletters.sort() || []).join(', ');
        if (currentNewsletters !== previousNewsletters) {
            return true;
        }

        // we've covered all the non-tracked cases we care about so fall
        // back on Ember Data's default dirty attribute checks
        let {hasDirtyAttributes} = member;

        return hasDirtyAttributes;
    }
}
