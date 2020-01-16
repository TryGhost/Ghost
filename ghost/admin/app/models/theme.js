import Model, {attr} from '@ember-data/model';
import {computed} from '@ember/object';
import {isBlank} from '@ember/utils';

export default Model.extend({
    active: attr('boolean'),
    errors: attr('raw'),
    name: attr('string'),
    package: attr('raw'),
    templates: attr('raw', {defaultValue: () => []}),
    warnings: attr('raw'),

    customTemplates: computed('templates.[]', function () {
        let templates = this.templates || [];

        return templates.filter(function (template) {
            return isBlank(template.slug);
        });
    }),

    slugTemplates: computed('templates.[]', function () {
        let templates = this.templates || [];

        return templates.filter(function (template) {
            return !isBlank(template.slug);
        });
    }),

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
