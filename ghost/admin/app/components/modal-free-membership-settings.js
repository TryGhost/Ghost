import ModalBase from 'ghost-admin/components/modal-base';
import classic from 'ember-classic-decorator';
import {action} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

// TODO: update modals to work fully with Glimmer components
@classic
export default class ModalFreeMembershipSettings extends ModalBase {
    @service settings;

    @inject config;

    @tracked freeSignupRedirect;

    get siteUrl() {
        return this.config.blogUrl;
    }

    @action
    close(event) {
        event?.preventDefault?.();
        this.closeModal();
    }

    actions = {
        // needed because ModalBase uses .send() for keyboard events
        closeModal() {
            this.close();
        },
        updateName(value) {
            this.settings.membersFreePriceName = value;
        },
        updateDescription(value) {
            this.settings.membersFreePriceDescription = value;
        },
        setFreeSignupRedirect(url) {
            this.freeSignupRedirect = url;
        },
        validateFreeSignupRedirect() {
            return this._validateSignupRedirect(this.freeSignupRedirect, 'membersFreeSignupRedirect');
        }
    };

    @task({drop: true})
    *save() {
        try {
            this.send('validateFreeSignupRedirect');
            if (this.settings.errors.length !== 0) {
                return;
            }
            yield this.settings.save();
            this.send('closeModal');
        } catch (error) {
            this.notifications.showAPIError(error, {key: 'settings.save'});
        } finally {
            this.send('closeModal');
        }
    }

    _validateSignupRedirect(url, type) {
        let errMessage = `Please enter a valid URL`;
        this.settings.errors.remove(type);
        this.settings.hasValidated.removeObject(type);

        if (url === null) {
            this.settings.errors.add(type, errMessage);
            this.settings.hasValidated.pushObject(type);
            return false;
        }

        if (url === undefined) {
            // Not initialised
            return;
        }

        if (url.href.startsWith(this.siteUrl)) {
            const path = url.href.replace(this.siteUrl, '');
            this.settings.type = path;
        } else {
            this.settings.type = url.href;
        }
    }
}
