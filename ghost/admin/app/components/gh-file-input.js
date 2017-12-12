import XFileInput from 'emberx-file-input/components/x-file-input';

// TODO: remove this override and use {{x-file-input}} directly once we've
// upgraded to emberx-file-input@1.2.0

export default XFileInput.extend({
    change(e) {
        let action = this.get('action');
        let files = this.files(e);

        if (files.length && action) {
            action(files, this.resetInput.bind(this));
        }
    },

    /**
    * Gets files from event object.
    *
    * @method
    * @private
    * @param {$.Event || Event}
    */
    files(e) {
        return (e.originalEvent || e).testingFiles || e.target.files;
    }
});
