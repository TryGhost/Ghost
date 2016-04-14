import Ember from 'ember';
import ValidationEngine from 'ghost/mixins/validation-engine';

const {
    computed,
    inject: {service},
} = Ember;

export default Ember.Component.extend(ValidationEngine, {
    validationType: 'client',
    slugGenerator: service(),

    isEnabled: Ember.computed.equal('client.status', 'enabled'),

    actions: {
        addUrl(){
            let domain = this.get('domain');
            this.get('addUrl')(domain);
            this.set('domain', '');
        },

        deleteUrl(value){
            this.get('deleteUrl')(value);
        },

        changeClientStatus(newStatus){
            return this.get('changeClientStatus')(newStatus).catch(err => {
                this.set('formError', err);
            });
        },

        refreshSecret(){
            return this.get('refreshSecret')().catch(err => {
                this.set('formError', err);
            });
        },

        saveClient(){
            let name = this.get('client.name');
            this.get('slugGenerator').generateSlug('client', name)
                .then((slug) => {
                    this.set('slug', slug);
                    return this.validate();
                })
                .then(() => {
                    let client = this.getProperties(['name', 'description', 'redirection_uri', 'logo', 'slug']);
                    this.get('saveClient')(client);
                })
                .catch(err => {
                    this.set('formError', err);
                });;

        }
    }
});
