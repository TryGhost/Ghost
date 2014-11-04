import FocusInput from 'ghost/components/gh-trim-focus-input';

var PostTitleInput = FocusInput.extend({
    click: function (event) {
        this._super(event);
        if (this.get('value') === '(Untitled)') {
            this.$().select();
        }
    },
    focusOut: function (event) {
        this._super(event);
        if (!this.get('value')) {
            this.set('value', '(Untitled)');
        }
    },
    selectOnInsert: function () {
        this.$().select();
    }.on('didInsertElement')
});

export default PostTitleInput;
