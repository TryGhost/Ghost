var Markdown = Ember.Component.extend({
    adjustScrollPosition: function () {
        var scrollWrapper = this.$('.entry-preview-content').get(0),
        // calculate absolute scroll position from percentage
            scrollPixel = scrollWrapper.scrollHeight * this.get('scrollPosition');

        scrollWrapper.scrollTop = scrollPixel; // adjust scroll position
    }.observes('scrollPosition')
});

export default Markdown;