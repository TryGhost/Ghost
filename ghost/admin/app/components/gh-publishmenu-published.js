import Component from '@ember/component';

export default Component.extend({

    'data-test-publishmenu-published': true,

    didInsertElement() {
        this.get('setSaveType')('publish');
    }
});
