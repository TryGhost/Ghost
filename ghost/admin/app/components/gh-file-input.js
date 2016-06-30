import Ember from 'ember';
import XFileInput from 'emberx-file-input/components/x-file-input';

// ember-cli-shims doesn't export Ember.testing
const {testing} = Ember;

export default XFileInput.extend({
    change(e) {
        let files = testing ? (e.originalEvent || e).testingFiles : e.target.files;
        this.sendAction('action', files);
    }
});
