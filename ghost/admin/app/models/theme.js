import Model from 'ember-data/model';
import attr from 'ember-data/attr';

export default Model.extend({
    name: attr('string'),
    package: attr('raw'),
    active: attr('boolean'),
    warnings: attr('raw'),
    errors: attr('raw'),

    activate() {
        let adapter = this.store.adapterFor(this.constructor.modelName);

        return adapter.activate(this).then(() => {
            // the server only gives us the newly active theme back so we need
            // to manually mark other themes as inactive in the store
            let activeThemes = this.store.peekAll('theme').filterBy('active', true);

            activeThemes.forEach((theme) => {
                if (theme !== this) {
                    // store.push is necessary to avoid dirty records that cause
                    // problems when we get new data back in subsequent requests
                    this.store.push({data: {
                        id: theme.id,
                        type: 'theme',
                        attributes: {active: false}
                    }});
                }
            });

            return this;
        });
    }
});
