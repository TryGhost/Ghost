const {Store} = require('express-session');

module.exports = class SessionStore extends Store {
    constructor(SessionModel) {
        super();
        this.SessionModel = SessionModel;
    }

    destroy(sid, callback) {
        this.SessionModel.forge({id: sid})
            .destroy({require: false})
            .then(() => {
                callback(null);
            }).catch(callback);
    }

    get(sid, callback) {
        this.SessionModel.forge({id: sid})
            .fetch()
            .then((model) => {
                if (!model) {
                    return callback(null, null);
                }
                callback(null, model.get('session_data'));
            })
            .catch(callback);
    }

    set(sid, sessionData, callback) {
        if (!sessionData.user_id) {
            return callback(new Error('Should not set sessions without a user_id'));
        }
        // TODO: shit below needs to be handled in the model
        this.SessionModel.forge({id: sid})
            .fetch({require: true})
            .then((model) => {
                return model.set('session_data', sessionData).save();
            }, () => {
                return this.SessionModel.forge({
                    id: sid
                }).save({
                    user_id: sessionData.user_id,
                    session_data: sessionData
                }, {method: 'insert'});
            })
            .then(() => {
                callback(null);
            })
            .catch(callback);
    }
};
