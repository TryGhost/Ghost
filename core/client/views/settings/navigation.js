import BaseView from 'ghost/views/settings/content-base';

var SettingsNavigationView = BaseView.extend({
    keyPress: function (event) {
        // + character
        if (event.keyCode === 43) {
            event.preventDefault();
            this.get('controller').send('addItem');
        }
    }
});

export default SettingsNavigationView;
