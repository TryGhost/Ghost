var enhanceLinkTo = {
    name: 'modify-linkto',

    initialize: function () {
        Ember.LinkView.reopen({
            attributeBindings: ['accesskey'],

            // Ensure that [Enter] is handled by a link-to
            // element *if* the current keyboard focus is
            // on that element
            keyDown: function (e) {
                if (e && e.keyCode && e.keyCode === 13) {
                    e.stopPropagation();
                    e.preventDefault();
                    e.currentTarget.click();
                    return false;
                }

                return true;
            }
        });
    }
};

export default enhanceLinkTo;
