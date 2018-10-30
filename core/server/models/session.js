const ghostBookshelf = require('./base');

const Session = ghostBookshelf.Model.extend({
    tableName: 'sessions',

    parse(attrs) {
        attrs.session_data = JSON.parse(attrs.session_data);
        return attrs;
    },

    format(attrs) {
        // CASE: format will be called when formatting all data for the DB
        // including for SELECTs meaning that if we call findOne without
        // a session_data property we'll get unintended JSON.stringify(undefined) calls
        if (attrs.session_data) {
            attrs.session_data = JSON.stringify(attrs.session_data);
        }
        return attrs;
    },

    user() {
        return this.belongsTo('User');
    }
}, {

    permittedOptions(methodName) {
        const permittedOptions = ghostBookshelf.Model.permittedOptions.call(this, methodName);
        if (methodName === 'upsert') {
            return permittedOptions.concat('session_id');
        }
        if (methodName === 'destroy') {
            return permittedOptions.concat('session_id');
        }
        return permittedOptions;
    },

    destroy(unfilteredOptions) {
        if (unfilteredOptions.id) {
            return ghostBookshelf.Model.destroy.call(this, unfilteredOptions);
        }
        const options = this.filterOptions(unfilteredOptions, 'destroy');

        // Fetch the object before destroying it, so that the changed data is available to events
        return this.forge({session_id: options.session_id})
            .fetch(options)
            .then((obj) => {
                return obj.destroy(options);
            });
    },

    upsert(data, unfilteredOptions) {
        const options = this.filterOptions(unfilteredOptions, 'upsert');
        const sessionId = options.session_id;
        const sessionData = data.session_data;
        const userId = sessionData.user_id;
        return this.findOne({session_id: sessionId}, options)
            .then((model) => {
                if (model) {
                    return this.edit({
                        session_data: sessionData
                    }, Object.assign(options, {
                        id: model.id
                    }));
                }
                return this.add({
                    session_id: sessionId,
                    session_data: sessionData,
                    user_id: userId
                }, options);
            });
    }
});

const Sessions = ghostBookshelf.Collection.extend({
    model: Session
});

module.exports = {
    Session: ghostBookshelf.model('Session', Session),
    Sessions: ghostBookshelf.collection('Sessions', Sessions)
};
