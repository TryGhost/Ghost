import Component from '@ember/component';
import classic from 'ember-classic-decorator';
import copyTextToClipboard from 'ghost-admin/utils/copy-text-to-clipboard';
import {action, computed} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
import {tagName} from '@ember-decorators/component';
import {task, timeout} from 'ember-concurrency';

@classic
@tagName('')
export default class GhPortalLinks extends Component {
    @service store;
    @service settings;

    @inject config;

    isLink = true;
    prices = null;
    copiedPrice = null;
    copiedSignupInterval = null;
    selectedTier = null;
    tiers = null;

    @computed('isLink')
    get toggleValue() {
        return this.isLink ? 'Data attributes' : 'Links';
    }

    @computed('isLink')
    get sectionHeaderLabel() {
        return this.isLink ? 'Link' : 'Data attribute';
    }

    @computed('selectedTier')
    get selectedTierIdPath() {
        const selectedTier = this.selectedTier;
        if (selectedTier) {
            return `/${selectedTier.name}`;
        }
        return '';
    }

    @computed('tiers.[]')
    get tierOptions() {
        if (this.tiers) {
            return this.tiers.map((tier) => {
                return {
                    label: tier.name,
                    name: tier.id
                };
            });
        }
        return [];
    }

    get siteUrl() {
        return this.config.blogUrl;
    }

    @action
    toggleShowLinks() {
        this.toggleProperty('isLink');
    }

    @action
    setSelectedTier(tier) {
        this.set('selectedTier', tier);
    }

    @task(function* () {
        const tiers = yield this.store.query('tier', {filter: 'type:paid+active:true', include: 'monthly_price,yearly_price'}) || [];
        this.set('tiers', tiers);
        if (tiers.length > 0) {
            this.set('selectedTier', {
                name: tiers.firstObject.id,
                label: tiers.firstObject.name
            });
        }
    })
        fetchTiers;

    @task(function* (id) {
        this.set('copiedPrice', id);
        let data = '';
        if (this.isLink) {
            data = id ? `#/portal/${id}` : `#/portal/`;
            data = this.siteUrl + `/` + data;
        } else {
            data = id ? `data-portal="${id}"` : `data-portal`;
        }
        copyTextToClipboard(data);
        yield timeout(this.isTesting ? 50 : 3000);
    })
        copyStaticLink;

    @task(function* (interval) {
        this.set('copiedSignupInterval', interval);
        let data = '';
        if (this.isLink) {
            data = `#/portal/signup${this.selectedTierIdPath}/${interval}`;
            data = this.siteUrl + `/` + data;
        } else {
            data = `data-portal="signup${this.selectedTierIdPath}/${interval}"`;
        }
        copyTextToClipboard(data);
        yield timeout(this.isTesting ? 50 : 3000);
    })
        copyTierSignupLink;
}
