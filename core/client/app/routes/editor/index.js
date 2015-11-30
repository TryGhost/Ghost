import Ember from 'ember';

const {Route} = Ember;

export default Route.extend({
    beforeModel() {
        this.transitionTo('editor.new');
    }
});
