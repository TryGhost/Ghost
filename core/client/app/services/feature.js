import Ember from 'ember';

const {
    Service,
    computed,
    inject: {service},
    PromiseProxyMixin,
    set
} = Ember;

export function feature(name) {
    return computed(`config.${name}`, `labs.${name}`, {
        get() {
            return this.get(`config.${name}`) || this.get(`labs.${name}`);
        },
        set(key, value) {
            this.update(name, value);
            return value;
        }
    });
}

export default Service.extend(PromiseProxyMixin, {
    store: service(),
    config: service(),
    notifications: service(),

    publicAPI: feature('publicAPI'),

    labs: computed('isSettled', 'content.labs', function () {
        let value = {};

        if (this.get('isFulfilled')) {
            try {
                value = JSON.parse(this.get('content.labs') || {});
            } catch (err) {
                value = {};
            }
        }

        return value;
    }),

    update(key, value) {
        let labs = this.get('labs');
        let content = this.get('content');

        set(labs, key, value);
        content.set('labs', JSON.stringify(labs));
        content.save().catch((errors) => {
            this.get('notifications').showErrors(errors);
            content.rollbackAttributes();
        });
    },

    init() {
        this._super(...arguments);

        let promise = this.get('store').query('setting', {type: 'blog'}).then((settings) => {
            return settings.get('firstObject');
        });

        this.set('promise', promise);
    }
});
