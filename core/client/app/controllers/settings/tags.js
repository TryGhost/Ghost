import Ember from 'ember';

export default Ember.Controller.extend({

    tagListFocused: Ember.computed.equal('keyboardFocus', 'tagList'),
    tagContentFocused: Ember.computed.equal('keyboardFocus', 'tagContent'),

    tags: Ember.computed.sort('model', function (a, b) {
        const idA = +a.get('id'),
              idB = +b.get('id');

        if (idA > idB) {
            return 1;
        } else if (idA < idB) {
            return -1;
        }

        return 0;
    })

});
