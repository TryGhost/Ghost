import Controller, {inject as controller} from '@ember/controller';
import EmberObject, {action, defineProperty} from '@ember/object';
import boundOneWay from 'ghost-admin/utils/bound-one-way';
import moment from 'moment';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

const SCRATCH_PROPS = ['name', 'email', 'note'];

export default class MemberController extends Controller {
    @controller members;
    @service session;
    @service dropdown;
    @service membersStats;
    @service notifications;
    @service router;
    @service store;

    @tracked isLoading = false;
    @tracked showDeleteMemberModal = false;
    @tracked showImpersonateMemberModal = false;
    @tracked showUnsavedChangesModal = false;
    @tracked modalLabel = null;
    @tracked showLabelModal = false;

    leaveScreenTransition = null;

    constructor() {
        super(...arguments);
        this._availableLabels = this.store.peekAll('label');
    }

    // Computed properties -----------------------------------------------------

    get member() {
        return this.model;
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

    set member(member) {
        this.model = member;
    }

    get scratchMember() {
        let scratchMember = EmberObject.create({member: this.member});
        SCRATCH_PROPS.forEach(prop => defineProperty(scratchMember, prop, boundOneWay(`member.${prop}`)));
        return scratchMember;
    }

    get subscribedAt() {
        // member can be a proxy object in a sparse array so .get is required
        let memberSince = moment(this.member.get('createdAtUTC')).from(moment());
        let createdDate = moment(this.member.get('createdAtUTC')).format('D MMM YYYY');
        return `${createdDate} (${memberSince})`;
    }

    // Actions -----------------------------------------------------------------

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
    toggleDeleteMemberModal() {
        this.showDeleteMemberModal = !this.showDeleteMemberModal;
    }

    @action
    toggleImpersonateMemberModal() {
        this.showImpersonateMemberModal = !this.showImpersonateMemberModal;
    }

    @action
    save() {
        return this.saveTask.perform();
    }

    @action
    deleteMember(cancelSubscriptions = false) {
        let options = {
            adapterOptions: {
                cancel: cancelSubscriptions
            }
        };
        return this.member.destroyRecord(options).then(() => {
            this.members.refreshData();
            this.transitionToRoute('members');
            return;
        }, (error) => {
            return this.notifications.showAPIError(error, {key: 'member.delete'});
        });
    }

    @action
    toggleUnsavedChangesModal(transition) {
        let leaveTransition = this.leaveScreenTransition;

        if (!transition && this.showUnsavedChangesModal) {
            this.leaveScreenTransition = null;
            this.showUnsavedChangesModal = false;
            return;
        }

        if (!leaveTransition || transition.targetName === leaveTransition.targetName) {
            this.leaveScreenTransition = transition;

            // if a save is running, wait for it to finish then transition
            if (this.save.isRunning) {
                return this.save.last.then(() => {
                    transition.retry();
                });
            }

            // we genuinely have unsaved data, show the modal
            this.showUnsavedChangesModal = true;
        }
    }

    @action
    leaveScreen() {
        this.member.rollbackAttributes();
        return this.leaveScreenTransition.retry();
    }

    // Tasks -------------------------------------------------------------------

    @task({drop: true})
    *saveTask() {
        let {member, scratchMember} = this;

        // if Cmd+S is pressed before the field loses focus make sure we're
        // saving the intended property values
        let scratchProps = scratchMember.getProperties(SCRATCH_PROPS);
        member.setProperties(scratchProps);

        try {
            yield member.save();
            member.updateLabels();
            this.members.refreshData();

            // replace 'member.new' route with 'member' route
            this.replaceRoute('member', member);

            return member;
        } catch (error) {
            if (error) {
                this.notifications.showAPIError(error, {key: 'member.save'});
            }
        }
    }

    @task
    *fetchMemberTask(memberId) {
        this.isLoading = true;

        this.member = yield this.store.queryRecord('member', {
            id: memberId,
            include: 'tiers'
        });

        this.isLoading = false;
    }

    // Private -----------------------------------------------------------------

    _saveMemberProperty(propKey, newValue) {
        let currentValue = this.member.get(propKey);

        if (newValue && typeof newValue === 'string') {
            newValue = newValue.trim();
        }

        // avoid modifying empty values and triggering inadvertant unsaved changes modals
        if (newValue !== false && !newValue && !currentValue) {
            return;
        }

        this.member.set(propKey, newValue);
    }
}
