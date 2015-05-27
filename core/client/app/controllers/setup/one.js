import Ember from 'ember';
import ajax from 'ghost/utils/ajax';

var SetupOneController = Ember.Controller.extend({

    count: 'many, many',

    downloadCounter: function () {
        var self = this,
            interval = 3000;

        Ember.run.later(this, function () {
            ajax({
                url: self.get('ghostPaths.count'),
                type: 'GET'
            }).then(function (data) {
                self.set('count', data.count.toLocaleString());
            }).catch(function () {
                self.set('count', 'many, many');
            });

            this.downloadCounter();
        }, interval);
    }.on('init')
});

export default SetupOneController;
