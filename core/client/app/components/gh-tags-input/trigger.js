import Trigger from 'ember-power-select/components/power-select-multiple/trigger';

export default Trigger.extend({
    actions: {
        reorderItems(items) {
            this.get('select').actions.choose(items);
        }
    }
});
