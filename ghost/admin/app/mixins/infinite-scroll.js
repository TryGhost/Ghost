import Ember from 'ember';

export default Ember.Mixin.create({
    isLoading: false,
    triggerPoint: 100,

    /**
     * Determines if we are past a scroll point where we need to fetch the next page
     * @param {object} event The scroll event
     */
    checkScroll: function (event) {
        var element = event.target,
            triggerPoint = this.get('triggerPoint'),
            isLoading = this.get('isLoading');

        // If we haven't passed our threshold or we are already fetching content, exit
        if (isLoading || (element.scrollTop + element.clientHeight + triggerPoint <= element.scrollHeight)) {
            return;
        }

        this.sendAction('fetch');
    },

    didInsertElement: function () {
        var el = this.get('element');

        el.onscroll = Ember.run.bind(this, this.checkScroll);

        if (el.scrollHeight <= el.clientHeight) {
            this.sendAction('fetch');
        }
    },

    willDestroyElement: function () {
        // turn off the scroll handler
        this.get('element').onscroll = null;
    }
});
