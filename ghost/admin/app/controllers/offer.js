import ArchiveOfferModal from '../components/modals/offers/archive';
import Controller, {inject as controller} from '@ember/controller';
import UnarchiveOfferModal from '../components/modals/offers/unarchive';
import config from 'ghost-admin/config/environment';
import copyTextToClipboard from 'ghost-admin/utils/copy-text-to-clipboard';
import {action} from '@ember/object';
import {getSymbol} from 'ghost-admin/utils/currency';
import {ghPriceAmount} from '../helpers/gh-price-amount';
import {inject as service} from '@ember/service';
import {slugify} from '@tryghost/string';
import {task} from 'ember-concurrency';
import {timeout} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class OffersController extends Controller {
    @controller offers;
    @service config;
    @service settings;
    @service store;
    @service modals;
    @service feature;
    @service membersUtils;
    @service notifications;

    @tracked cadences = [];
    @tracked tiers = [];
    @tracked portalPreviewUrl = '';
    @tracked showUnsavedChangesModal = false;

    @tracked defaultSiteUrl = this.config.get('blogUrl');

    @tracked durations = [
        {
            label: 'Forever',
            duration: 'forever'
        },
        {
            label: 'First-payment',
            duration: 'once'
        },
        {
            label: 'Multiple-months',
            duration: 'repeating'
        }
    ];

    @tracked offertypes = [
        {
            label: '%',
            offertype: 'percent'
        },
        {
            label: 'USD',
            offertype: 'fixed'
        }
    ];

    @tracked defaultProps = null;
    @tracked isDisplayTitleEdited = false;

    leaveScreenTransition = null;
    portalPreviewGuid = Date.now().valueOf();

    constructor() {
        super(...arguments);
        if (this.isTesting === undefined) {
            this.isTesting = config.environment === 'test';
        }
    }

    get offer() {
        return this.model;
    }

    set offer(offer) {
        this.model = offer;
    }

    get scratchOffer() {
        return {
            ...this.offer
        };
    }

    get cadence() {
        if (this.offer.tier && this.offer.cadence) {
            const tier = this.tiers.findBy('id', this.offer.tier.id);
            return `${this.offer.tier.id}-${this.offer.cadence}-${tier?.currency}`;
        } else if (this.defaultProps) {
            const tier = this.tiers.findBy('id', this.defaultProps.tier.id);
            return `${this.defaultProps.tier.id}-${this.defaultProps.cadence}-${tier?.currency}`;
        }
        return '';
    }

    get isDiscountSectionDisabled() {
        return !this.offer.isNew;
    }

    // Tasks -------------------------------------------------------------------

    @task({drop: true})
    *fetchTiers() {
        this.tiers = yield this.store.query('tier', {filter: 'type:paid+active:true', include: 'monthly_price,yearly_price'});
        this.tiers = this.tiers.filter((d) => {
            return d.monthlyPrice && d.yearlyPrice;
        });
        const cadences = [];
        this.tiers.forEach((tier) => {
            let monthlyLabel;
            let yearlyLabel;
            const tierCurrency = tier.currency;
            const tierCurrencySymbol = tierCurrency.toUpperCase();
            monthlyLabel = `${tier.name} - Monthly (${ghPriceAmount(tier.monthlyPrice)} ${tierCurrencySymbol})`;
            yearlyLabel = `${tier.name} - Yearly (${ghPriceAmount(tier.yearlyPrice)} ${tierCurrencySymbol})`;

            cadences.push({
                label: monthlyLabel,
                name: `${tier.id}-month-${tierCurrency}`
            });

            cadences.push({
                label: yearlyLabel,
                name: `${tier.id}-year-${tierCurrency}`
            });
        });
        this.cadences = cadences;
        const defaultCadence = this.cadences[0]?.name;
        const [,interval, defaultCurrency] = (defaultCadence || '').split('-');

        this.updateDurations(interval);
        if (this.offer && !this.offer.tier) {
            this.defaultProps = {};
            this.updateCadence(defaultCadence, this.defaultProps);
            this.updatePortalPreview({forceRefresh: false});
        } else if (defaultCadence) {
            this.offertypes = [
                {
                    label: '%',
                    offertype: 'percent'
                },
                {
                    label: defaultCurrency.toUpperCase(),
                    offertype: 'fixed'
                }
            ];
            this.updatePortalPreview({forceRefresh: false});
        }
    }

    @task({drop: true})
    *copyOfferUrl() {
        copyTextToClipboard(this.offerUrl);
        yield timeout(this.isTesting ? 50 : 500);
        return true;
    }

    @task({drop: true})
    *saveTask() {
        let {offer} = this;

        if (!offer.tier && this.defaultProps) {
            this.offer.tier = {
                id: this.defaultProps?.tier.id
            };
            this.offer.cadence = this.defaultProps.cadence;
            this.offer.currency = this.defaultProps.currency;
        }

        try {
            yield this.offer.validate();
            yield offer.save();

            // replace 'offer.new' route with 'offer' route
            this.replaceRoute('offer', offer);

            return offer;
        } catch (error) {
            if (error) {
                this.notifications.showAPIError(error, {key: 'offer.save'});
            }
        }
    }

    @task
    *fetchOfferTask(offerId) {
        this.isLoading = true;

        this.offer = yield this.store.queryRecord('offer', {
            id: offerId
        });

        this.isLoading = false;
    }

    @action
    portalPreviewInserted(iframe) {
        this.portalPreviewIframe = iframe;

        if (!this.portalMessageListener) {
            this.portalMessageListener = (event) => {
                const resizeEvents = ['portal-ready', 'portal-preview-updated'];
                if (resizeEvents.includes(event.data.type) && event.data.payload?.height && this.portalPreviewIframe?.parentNode) {
                    this.portalPreviewIframe.parentNode.style.height = `${event.data.payload.height}px`;
                }
            };

            window.addEventListener('message', this.portalMessageListener, true);
        }
    }

    @action
    portalPreviewDestroyed() {
        this.portalPreviewIframe = null;

        if (this.portalMessageListener) {
            window.removeEventListener('message', this.portalMessageListener);
        }
    }

    @action
    updatePortalPreview({forceRefresh} = {forceRefresh: false}) {
        const newUrl = new URL(this.membersUtils.getOfferPortalPreviewUrl({
            name: this.offer.name || 'No Name',
            code: this.offer.code || 'no-code',
            displayTitle: this.offer.displayTitle,
            displayDescription: this.offer.displayDescription,
            type: this.offer.type,
            cadence: this.offer.cadence || this.defaultProps?.cadence,
            amount: this.offer.amount,
            duration: this.offer.duration,
            durationInMonths: this.offer.durationInMonths,
            currency: this.offer.currency || this.defaultProps?.currency,
            status: this.offer.currency,
            tierId: this.offer?.tier?.id || this.defaultProps?.tier?.id
        }));

        if (forceRefresh) {
            this.portalPreviewGuid = Date.now().valueOf();
        }
        newUrl.searchParams.set('v', `${this.portalPreviewGuid}`);

        this.portalPreviewUrl = newUrl;
    }

    @action
    save() {
        return this.saveTask.perform();
    }

    @action
    leaveScreen() {
        this.offer.rollbackAttributes();
        return this.leaveScreenTransition.retry();
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
    setup() {
        this.fetchTiers.perform();
    }

    @action
    setProperty(propKey, value) {
        this._saveOfferProperty(propKey, value);
    }

    @action
    setDiscountType(discountType) {
        if (!this.isDiscountSectionDisabled) {
            const amount = this.offer.amount || 0;
            this._saveOfferProperty('type', discountType);
            if (this.offer.type === 'fixed' && this.offer.amount !== '') {
                this.offer.amount = amount * 100;
            } else if (this.offer.amount !== '') {
                this.offer.amount = amount / 100;
            }
            this.updatePortalPreview({forceRefresh: false});
        }
    }

    @action
    setDiscountAmount(e) {
        let amount = e.target.value;
        if (this.offer.type === 'fixed' && amount !== '') {
            amount = parseFloat(amount) * 100;
        }
        this._saveOfferProperty('amount', amount);
    }

    @action
    setOfferName(e) {
        this._saveOfferProperty('name', e.target.value);
        if (!this.isDisplayTitleEdited && this.offer.isNew) {
            this._saveOfferProperty('displayTitle', e.target.value);
        }
    }

    @action
    setPortalTitle(e) {
        this.isDisplayTitleEdited = true;
        this._saveOfferProperty('displayTitle', e.target.value);
    }

    @action
    setPortalDescription(e) {
        this._saveOfferProperty('displayDescription', e.target.value);
    }

    @action
    setOfferCode(e) {
        this._saveOfferProperty('code', e.target.value);
    }

    @action
    setDurationInMonths(e) {
        this._saveOfferProperty('durationInMonths', e.target.value);
    }

    @action
    openConfirmArchiveModal() {
        if (!this.offer.isNew) {
            this.modals.open(ArchiveOfferModal, {
                offer: this.offer
            });
        }
    }

    @action
    openConfirmUnarchiveModal() {
        if (!this.offer.isNew) {
            this.modals.open(UnarchiveOfferModal, {
                offer: this.offer
            });
        }
    }

    get offerUrl() {
        const code = this.offer?.code || '';
        if (code) {
            const siteUrl = this.config.get('blogUrl');
            return `${siteUrl}/${slugify(code)}`;
        }
        return '';
    }

    get displayCurrency() {
        const tierId = this.offer?.tier?.id;
        if (!tierId) {
            return '$';
        }
        const tier = this.tiers.findBy('id', tierId);
        const tierCurrency = tier?.currency || 'usd';
        return getSymbol(tierCurrency);
    }

    get currencyLength() {
        return this.displayCurrency.length;
    }

    @action
    updateDurations(cadence) {
        if (cadence) {
            if (cadence === 'month') {
                this.durations = [
                    {
                        label: 'First-payment',
                        duration: 'once'
                    },
                    {
                        label: 'Multiple-months',
                        duration: 'repeating'
                    },
                    {
                        label: 'Forever',
                        duration: 'forever'
                    }
                ];
            } else {
                this.durations = [
                    {
                        label: 'First-payment',
                        duration: 'once'
                    },
                    {
                        label: 'Forever',
                        duration: 'forever'
                    }
                ];
                if (this.offer.duration === 'repeating') {
                    this._saveOfferProperty('duration', 'once');
                }
            }
        }
    }

    @action
    updateCadence(cadence, offerObj) {
        offerObj = offerObj || this.offer;
        if (cadence) {
            const [tierId, tierCadence, currency] = cadence.split('-');
            offerObj.tier = {
                id: tierId
            };
            offerObj.cadence = tierCadence;
            offerObj.currency = currency;
            this.offertypes = [
                {
                    label: '%',
                    offertype: 'percent'
                },
                {
                    label: currency.toUpperCase(),
                    offertype: 'fixed'
                }
            ];
            this.updateDurations(tierCadence);
            this.updatePortalPreview({forceRefresh: false});
        }
    }

    @action
    updateDuration(duration) {
        this._saveOfferProperty('duration', duration);
    }

    // Private -----------------------------------------------------------------

    _saveOfferProperty(propKey, newValue) {
        let currentValue = this.offer[propKey];

        // avoid modifying empty values and triggering inadvertant unsaved changes modals
        if (newValue !== false && !newValue && !currentValue) {
            return;
        }

        this.offer[propKey] = newValue;
        this.updatePortalPreview({forceRefresh: false});
    }
}
