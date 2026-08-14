import Component from '@glimmer/component';
import {inject as service} from '@ember/service';

export default class GhMigrateModal extends Component {
    @service migrate;

    get visibilityClass() {
        return this.migrate.migrateWindowOpen ? 'gh-migrate' : 'gh-migrate closed';
    }
}
