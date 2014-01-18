var Store = require('express').session.Store,
    time12h = 12 * 60 * 60 * 1000,
    BSStore,
    dataProvider,
    db,
    client;

// Initialize store and clean old sessions
BSStore = function BSStore(dataProvider, options) {
    var self = this;
    this.dataProvider = dataProvider;
    options = options || {};
    Store.call(this, options);

    this.dataProvider.Session.findAll()
        .then(function (model) {
            var i,
                now = new Date().getTime();
            for (i = 0; i < model.length; i = i + 1) {
                if (now > model.at(i).get('expires')) {
                    self.destroy(model.at(i).get('id'));
                }
            }
        });
};

BSStore.prototype = new Store();

// store a given session
BSStore.prototype.set = function (sid, sessData, callback) {
    var maxAge = sessData.cookie.maxAge,
        now = new Date().getTime(),
        expires = maxAge ? now + maxAge : now + time12h,
        sessionModel = this.dataProvider.Session;

    sessData = JSON.stringify(sessData);

    //necessary since bookshelf updates models if id is set
    sessionModel.forge({id: sid}).fetch()
        .then(function (model) {
            if (model) {
                return sessionModel.forge({id: sid, expires: expires, sess: sessData }).save();
            }
            return sessionModel.forge({id: sid, expires: expires, sess: sessData })
                .save(null, {method: 'insert'});
        }).then(function () {
            callback();
        });
};

// fetch a session, if session is expired delete it
BSStore.prototype.get = function (sid, callback) {
    var now = new Date().getTime(),
        self = this,
        sess,
        expires;

    this.dataProvider.Session.forge({id: sid})
        .fetch()
        .then(function (model) {
            if (model) {
                sess = JSON.parse(model.get('sess'));
                expires = model.get('expires');
                if (now < expires) {
                    callback(null, sess);
                } else {
                    self.destroy(sid, callback);
                }
            } else {
                callback();
            }
        });
};

// delete a given sessions
BSStore.prototype.destroy = function (sid, callback) {
    this.dataProvider.Session.forge({id: sid})
        .destroy()
        .then(function () {
            // check if callback is null
            // session.regenerate doesn't provide callback
            // cleanup at startup does neither 
            if (callback) {
                callback();
            }
        });
};

// get the count of all stored sessions
BSStore.prototype.length = function (callback) {
    this.dataProvider.Session.findAll()
        .then(function (model) {
            callback(null, model.length);
        });
};

// delete all sessions
BSStore.prototype.clear = function (callback) {
    this.dataProvider.Session.destroyAll()
        .then(function () {
            callback();
        });
};


module.exports = BSStore;
