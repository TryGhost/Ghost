import Controller from '@ember/controller';
import DeleteUserModal from '../../../components/settings/staff/modals/delete-user';
import RegenerateStaffTokenModal from '../../../components/settings/staff/modals/regenerate-staff-token';
import SelectRoleModal from '../../../components/settings/staff/modals/select-role';
import SuspendUserModal from '../../../components/settings/staff/modals/suspend-user';
import TransferOwnershipModal from '../../../components/settings/staff/modals/transfer-ownership';
import UnsuspendUserModal from '../../../components/settings/staff/modals/unsuspend-user';
import UploadImageModal from '../../../components/settings/staff/modals/upload-image';
import copyTextToClipboard from 'ghost-admin/utils/copy-text-to-clipboard';
import isNumber from 'ghost-admin/utils/isNumber';
import windowProxy from 'ghost-admin/utils/window-proxy';
import {TrackedObject} from 'tracked-built-ins';
import {action} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';
import {task, taskGroup, timeout} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class UserController extends Controller {
    @service ajax;
    @service ghostPaths;
    @service membersUtils;
    @service modals;
    @service notifications;
    @service session;
    @service slugGenerator;
    @service utils;

    @inject config;

    @tracked dirtyAttributes = false;
    @tracked personalToken = null;
    @tracked personalTokenRegenerated = false;
    @tracked scratchValues = new TrackedObject();
    @tracked slugValue = null; // not set directly on model to avoid URL changing before save

    get user() {
        return this.model;
    }

    get currentUser() {
        return this.session.user;
    }

    get isOwnProfile() {
        return this.currentUser.id === this.user.id;
    }

    get isAdminUserOnOwnProfile() {
        return this.currentUser.isAdminOnly && this.isOwnProfile;
    }

    get isAdminUserOnOwnerProfile() {
        return this.currentUser.isAdminOnly && this.user.isOwnerOnly;
    }

    get canChangeEmail() {
        return !this.isAdminUserOnOwnerProfile;
    }

    get canChangePassword() {
        return !this.isAdminUserOnOwnerProfile;
    }

    get canMakeOwner() {
        return this.currentUser.isOwnerOnly
            && !this.isOwnProfile
            && this.user.isAdminOnly
            && !this.user.isSuspended;
    }

    get canToggleMemberAlerts() {
        return this.currentUser.isOwnerOnly || this.isAdminUserOnOwnProfile;
    }

    get rolesDropdownIsVisible() {
        return this.currentUser.isAdmin && !this.isOwnProfile && !this.user.isOwnerOnly;
    }

    get userActionsAreVisible() {
        return this.deleteUserActionIsVisible || this.canMakeOwner;
    }

    get deleteUserActionIsVisible() {
        // users can't delete themselves
        if (this.isOwnProfile) {
            return false;
        }

        if (
            // owners/admins can delete any non-owner user
            (this.currentUser.isAdmin && !this.user.isOwnerOnly) ||
            // editors can delete any author or contributor
            (this.currentUser.isEditor && this.user.isAuthorOrContributor)
        ) {
            return true;
        }

        return false;
    }

    @action
    setModelProperty(property, event) {
        const value = event.target.value;
        this.user[property] = value;
    }

    @action
    validateModelProperty(property) {
        this.user.validate({property});
    }

    @action
    clearModelErrors(property) {
        this.user.hasValidated.removeObject(property);
        this.user.errors.remove(property);
    }

    @action
    setSlugValue(event) {
        this.slugValue = event.target.value;
    }

    @action
    async deleteUser() {
        await this.modals.open(DeleteUserModal, {
            user: this.model
        });
    }

    @action
    async suspendUser() {
        await this.modals.open(SuspendUserModal, {
            user: this.model,
            saveTask: this.saveTask
        });
    }

    @action
    async unsuspendUser() {
        await this.modals.open(UnsuspendUserModal, {
            user: this.model,
            saveTask: this.saveTask
        });
    }

    @action
    async transferOwnership() {
        await this.modals.open(TransferOwnershipModal, {
            user: this.model
        });
    }

    @action
    async regenerateStaffToken() {
        const apiToken = await this.modals.open(RegenerateStaffTokenModal);

        if (apiToken) {
            this.personalToken = apiToken;
            this.personalTokenRegenerated = true;
        }
    }

    @action
    async selectRole() {
        const newRole = await this.modals.open(SelectRoleModal, {
            currentRole: this.model.role
        });

        if (newRole) {
            this.user.role = newRole;
            this.dirtyAttributes = true;
        }
    }

    @action
    async changeCoverImage() {
        await this.modals.open(UploadImageModal, {
            model: this.model,
            modelProperty: 'coverImage'
        });
    }

    @action
    async changeProfileImage() {
        await this.modals.open(UploadImageModal, {
            model: this.model,
            modelProperty: 'profileImage'
        });
    }

    @action
    setScratchValue(property, value) {
        this.scratchValues[property] = value;
    }

    @action
    reset() {
        this.user.rollbackAttributes();
        this.user.password = '';
        this.user.newPassword = '';
        this.user.ne2Password = '';
        this.slugValue = this.user.slug;
        this.dirtyAttributes = false;
        this.clearScratchValues();
    }

    @action
    toggleCommentNotifications(event) {
        this.user.commentNotifications = event.target.checked;
    }

    @action
    toggleMentionNotifications(event) {
        this.user.mentionNotifications = event.target.checked;
    }

    @action
    toggleMilestoneNotifications(event) {
        this.user.milestoneNotifications = event.target.checked;
    }

    @action
    toggleMemberEmailAlerts(type, event) {
        if (type === 'free-signup') {
            this.user.freeMemberSignupNotification = event.target.checked;
        } else if (type === 'paid-started') {
            this.user.paidSubscriptionStartedNotification = event.target.checked;
        } else if (type === 'paid-canceled') {
            this.user.paidSubscriptionCanceledNotification = event.target.checked;
        }
    }

    @taskGroup({enqueue: true}) saveHandlers;

    @task({group: 'saveHandlers'})
    *updateSlugTask(event) {
        let newSlug = event.target.value;
        let slug = this.user.slug;

        newSlug = newSlug || slug;
        newSlug = newSlug.trim();

        // Ignore unchanged slugs or candidate slugs that are empty
        if (!newSlug || slug === newSlug) {
            this.slugValue = slug;

            return true;
        }

        let serverSlug = yield this.slugGenerator.generateSlug('user', newSlug);

        // If after getting the sanitized and unique slug back from the API
        // we end up with a slug that matches the existing slug, abort the change
        if (serverSlug === slug) {
            return true;
        }

        // Because the server transforms the candidate slug by stripping
        // certain characters and appending a number onto the end of slugs
        // to enforce uniqueness, there are cases where we can get back a
        // candidate slug that is a duplicate of the original except for
        // the trailing incrementor (e.g., this-is-a-slug and this-is-a-slug-2)

        // get the last token out of the slug candidate and see if it's a number
        let slugTokens = serverSlug.split('-');
        let check = Number(slugTokens.pop());

        // if the candidate slug is the same as the existing slug except
        // for the incrementor then the existing slug should be used
        if (isNumber(check) && check > 0) {
            if (slug === slugTokens.join('-') && serverSlug !== newSlug) {
                this.slugValue = slug;

                return true;
            }
        }

        this.slugValue = serverSlug;
        this.dirtyAttributes = true;

        return true;
    }

    @task({group: 'saveHandlers'})
    *saveTask() {
        let user = this.user;
        let slugValue = this.slugValue;
        let slugChanged;

        if (user.slug !== slugValue) {
            slugChanged = true;
            user.slug = slugValue;
        }

        try {
            user = yield user.save();

            this.clearScratchValues();

            // If the user's slug has changed, change the URL and replace
            // the history so refresh and back button still work
            if (slugChanged) {
                let currentPath = window.location.hash;

                let newPath = currentPath.split('/');
                newPath[newPath.length - 1] = user.get('slug');
                newPath = newPath.join('/');

                windowProxy.replaceState({path: newPath}, '', newPath);
            }

            this.dirtyAttributes = false;
            this.notifications.closeAlerts('user.update');

            return user;
        } catch (error) {
            // validation engine returns undefined so we have to check
            // before treating the failure as an API error
            if (error) {
                this.notifications.showAPIError(error, {key: 'user.update'});
            }
        }
    }

    @task
    *saveNewPasswordTask() {
        try {
            const user = yield this.user.saveNewPasswordTask.perform();
            document.querySelector('#password-reset')?.reset();
            return user;
        } catch (error) {
            if (error) {
                this.notifications.showAPIError(error, {key: 'user.update'});
            }
        }
    }

    @action
    submitPasswordForm(event) {
        event.preventDefault();
        this._blurAndTrigger(() => this.saveNewPasswordTask.perform());
    }

    @action
    saveViaKeyboard(event) {
        event.preventDefault();
        this._blurAndTrigger(() => this.saveTask.perform());
    }

    @task
    *copyContentKeyTask() {
        copyTextToClipboard(this.personalToken);
        yield timeout(this.isTesting ? 50 : 3000);
    }

    clearScratchValues() {
        this.scratchValues = new TrackedObject();
    }

    _blurAndTrigger(fn) {
        // trigger any set-on-blur actions
        const focusedElement = document.activeElement;
        focusedElement?.blur();

        // schedule save for when set-on-blur actions have finished
        run.schedule('actions', this, function () {
            focusedElement?.focus();
            fn();
        });
    }
}
