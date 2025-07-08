import Service, {inject as service} from '@ember/service';
import {inject} from 'ghost-admin/decorators/inject';
import {tracked} from '@glimmer/tracking';

export default class ThemeManagementService extends Service {
    @service store;
    @service session;

    @inject config;

    /**
     * Contains the active theme object (includes warnings and errors)
     */
    @tracked activeTheme;

    async fetch() {
        // contributors don't have permissions to fetch active theme
        if (this.session.user && !this.session.user.isContributor) {
            try {
                const adapter = this.store.adapterFor('theme');
                const activeTheme = await adapter.active();
                this.activeTheme = activeTheme;
            } catch (e) {
                // We ignore these errors and log them because we don't want to block loading the app for this
                console.error('Failed to fetch active theme', e); // eslint-disable-line no-console
            }
        }
    }
}
