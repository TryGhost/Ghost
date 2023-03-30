import Controller from '@ember/controller';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class MigrateController extends Controller {
    @service migrate;
    @service router;

    get visibilityClass() {
        return this.migrate.isIframeTransition ? 'migrate iframe-migrate-container' : ' migrate fullscreen-migrate-container';
    }

    @action
    closeMigrate() {
        this.router.transitionTo('/settings/labs');
    }
}
