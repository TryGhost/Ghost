import Controller from '@ember/controller';
import moment from 'moment';
import {alias} from '@ember/object/computed';
import {computed} from '@ember/object';
import {inject as controller} from '@ember/controller';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default Controller.extend({
    members: controller(),
    store: service(),

    router: service(),

    notifications: service(),

    member: alias('model'),
    subscribedAt: computed('member.createdAt', function () {
        let memberSince = moment(this.member.createdAt).from(moment());
        let createdDate = moment(this.member.createdAt).format('MMM DD, YYYY');
        return `${createdDate} (${memberSince})`;
    }),

    actions: {
        setProperty(propKey, value) {
            this._saveMemberProperty(propKey, value);
        },
        toggleDeleteMemberModal() {
            this.toggleProperty('showDeleteMemberModal');
        },
        finaliseDeletion() {
            // decrememnt the total member count manually so there's no flash
            // when transitioning back to the members list
            if (this.members.meta) {
                this.members.decrementProperty('meta.pagination.total');
            }
            this.router.transitionTo('members');
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
            let transition = this.leaveScreenTransition;

            if (!transition) {
                this.notifications.showAlert('Sorry, there was an error in the application. Please let the Ghost team know what happened.', {type: 'error'});
                return;
            }

            // roll back changes on model props
            this.member.rollbackAttributes();

            return transition.retry();
        }
    },

    save: task(function* () {
        let member = this.member;
        try {
            return yield member.save();
        } catch (error) {
            if (error) {
                this.notifications.showAPIError(error, {key: 'member.save'});
            }
        }
    }).drop(),

    _saveMemberProperty(propKey, newValue) {
        let member = this.member;
        member.set(propKey, newValue);
    },

    fetchMember: task(function* (memberId) {
        this.set('isLoading', true);
        yield this.store.findRecord('member', memberId, {
            reload: true
        }).then((data) => {
            this.set('member', data);
            this.set('isLoading', false);
        });
    })

});
