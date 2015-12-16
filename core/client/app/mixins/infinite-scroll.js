import Ember from 'ember';

const {Mixin, run} = Ember;

export default Mixin.create({
    isLoading: false,
    triggerPoint: 100,

    /**
     * Determines if we are past a scroll point where we need to fetch the next page
     * @param {object} event The scroll event
     */
    checkScroll(event) {
        let element = event.target;
        let triggerPoint = this.get('triggerPoint');
        let isLoading = this.get('isLoading');

        // If we haven't passed our threshold or we are already fetching content, exit
        if (isLoading || (element.scrollTop + element.clientHeight + triggerPoint <= element.scrollHeight)) {
            return;
        }

        this.sendAction('fetch');
    },

    didInsertElement() {
        this._super(...arguments);

        let el = this.get('element');

        el.onscroll = run.bind(this, this.checkScroll);

        if (el.scrollHeight <= el.clientHeight) {
            this.sendAction('fetch');
        }
    },

    willDestroyElement() {
        this._super(...arguments);

        // turn off the scroll handler
        this.get('element').onscroll = null;
    }
});
