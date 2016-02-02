import Ember from 'ember';
import ValidationEngine from 'ghost/mixins/validation-engine';

const {
    computed,
    inject: {service},
} = Ember;

export default Ember.Component.extend(ValidationEngine, {
    validationType: 'client',
    slugGenerator: service(),

    init() {
        this._super(...arguments);
    },

    isEnabled: computed('status', {
        get() {
            return this.get('status') === 'enabled';
        }
    }),

    actions: {
        addUrl(){
            let domain = this.get('domain');
            this.attrs.addUrl(domain);
            this.set('domain', '');
        },

        deleteUrl(value){
            this.attrs.deleteUrl(value);
        },

        changeClientStatus(newStatus){
            return this.attrs.changeClientStatus(newStatus).catch(err => {
                this.set('formError', err);
            });
        },

        refreshSecret(){
            return this.attrs.refreshSecret().catch(err => {
                this.set('formError', err);
            });
        },

        saveClient(){
            let name = this.get('name');
            this.get('slugGenerator').generateSlug('client', name)
                .then((slug) => {
                    this.set('slug', slug);
                    return this.validate();
                })
                .then(() => {
                    let client = this.getProperties(['name', 'description', 'redirection_uri', 'logo', 'slug']);
                    this.attrs.saveClient(client);
                })
                .catch(err => {
                    this.set('formError', err);
                });;

        }
    }
});
