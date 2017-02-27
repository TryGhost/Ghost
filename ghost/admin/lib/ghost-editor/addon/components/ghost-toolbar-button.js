import Ember from 'ember';
import layout from '../templates/components/ghost-toolbar-button';

export default Ember.Component.extend({
    layout,
    tagName: 'li',
    classNameBindings: ['selected', 'primary', 'secondary'],
    actions: {
        click: function () {
            this.tool.onClick(this.editor);
        },
    },
    willRender: function() {
        if(this.tool.selected) {
            this.set('selected', true);
        } else {
            this.set('selected', false);
        }

        if(this.tool.visibility) {
            this.set(this.tool.visibility,true);
        }

    }
});
