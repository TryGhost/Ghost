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
        this.SessionModel
            .upsert(sid, sessionData)
            .then(() => {
                callback(null);
            })
            .catch(callback);
    }
};
