import Controller from '@ember/controller';
import EmberObject from '@ember/object';
import boundOneWay from 'ghost-admin/utils/bound-one-way';
import moment from 'moment';
import {alias} from '@ember/object/computed';
import {computed, defineProperty} from '@ember/object';
import {inject as controller} from '@ember/controller';
import {inject as service} from '@ember/service';
import {task, timeout} from 'ember-concurrency';

const SCRATCH_PROPS = ['name', 'email', 'note'];

export default Controller.extend({
    members: controller(),
    session: service(),
    dropdown: service(),
    notifications: service(),
    router: service(),
    store: service(),

    showImpersonateMemberModal: false,

    member: alias('model'),

    scratchMember: computed('member', function () {
        let scratchMember = EmberObject.create({member: this.member});
        SCRATCH_PROPS.forEach(prop => defineProperty(scratchMember, prop, boundOneWay(`member.${prop}`)));
        return scratchMember;
    }),

    subscribedAt: computed('member.createdAtUTC', function () {
        let memberSince = moment(this.member.createdAtUTC).from(moment());
        let createdDate = moment(this.member.createdAtUTC).format('MMM DD, YYYY');
        return `${createdDate} (${memberSince})`;
    }),

    actions: {
        setProperty(propKey, value) {
            this._saveMemberProperty(propKey, value);
        },

        toggleDeleteMemberModal() {
            this.toggleProperty('showDeleteMemberModal');
        },

        toggleImpersonateMemberModal() {
            this.toggleProperty('showImpersonateMemberModal');
        },

        save() {
            return this.save.perform();
        },

        deleteMember() {
            return this.member.destroyRecord().then(() => {
                return this.transitionToRoute('members');
            }, (error) => {
                return this.notifications.showAPIError(error, {key: 'member.delete'});
            });
        },

        toggleUnsavedChangesModal(transition) {
            let leaveTransition = this.leaveScreenTransition;

            if (!transition && this.showUnsavedChangesModal) {
                this.set('leaveScreenTransition', null);
                this.set('showUnsavedChangesModal', false);
                return;
            }

            if (!leaveTransition || transition.targetName === leaveTransition.targetName) {
                this.set('leaveScreenTransition', transition);

                // if a save is running, wait for it to finish then transition
                if (this.save.isRunning) {
                    return this.save.last.then(() => {
                        transition.retry();
                    });
                }

                // we genuinely have unsaved data, show the modal
                this.set('showUnsavedChangesModal', true);
            }
        },

        leaveScreen() {
            this.member.rollbackAttributes();
            return this.leaveScreenTransition.retry();
        }
    },

    saveMember: task(function* () {
        let {member, scratchMember} = this;

        // if Cmd+S is pressed before the field loses focus make sure we're
        // saving the intended property values
        let scratchProps = scratchMember.getProperties(SCRATCH_PROPS);
        member.setProperties(scratchProps);

        try {
            yield member.save();
            member.updateLabels();
            // replace 'member.new' route with 'member' route
            this.replaceRoute('member', member);

            return member;
        } catch (error) {
            if (error) {
                this.notifications.showAPIError(error, {key: 'member.save'});
            }
        }
    }).drop(),

    save: task(function* () {
        yield this.saveMember.perform();
        yield timeout(2500);
        if (this.get('saveMember.last.isSuccessful') && this.get('saveMember.last.value')) {
            // Reset last task to bring button back to idle state
            yield this.set('saveMember.last', null);
        }
    }).drop(),

    fetchMember: task(function* (memberId) {
        this.set('isLoading', true);

        let member = yield this.store.findRecord('member', memberId, {
            reload: true
        });

        this.set('member', member);
        this.set('isLoading', false);
    }),

    _saveMemberProperty(propKey, newValue) {
        let currentValue = this.member.get(propKey);

        if (newValue) {
            newValue = newValue.trim();
        }

        // avoid modifying empty values and triggering inadvertant unsaved changes modals
        if (newValue !== false && !newValue && !currentValue) {
            return;
        }

        this.member.set(propKey, newValue);
    }
});
