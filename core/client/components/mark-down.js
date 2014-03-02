export default Ember.Component.extend({
  adjustScrollPosition: function() {
    var scrollWrapper = this.$(".entry-preview-content").get(0),
      scrollPixel = scrollWrapper.scrollHeight*this.get('scrollPosition'); // calculate absolute scroll position from percentage

    scrollWrapper.scrollTop = scrollPixel; // adjust scroll position
  }.observes("scrollPosition")
});