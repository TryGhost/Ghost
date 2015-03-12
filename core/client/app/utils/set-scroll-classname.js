// ## scrollShadow
// This adds a 'scroll' class to the targeted element when the element is scrolled
// `this` is expected to be a jQuery-wrapped element
// **target:** The element in which the class is applied. Defaults to scrolled element.
// **class-name:** The class which is applied.
// **offset:** How far the user has to scroll before the class is applied.
var setScrollClassName = function (options) {
    var $target = options.target || this,
        offset = options.offset,
        className = options.className || 'scrolling';

    if (this.scrollTop() > offset) {
        $target.addClass(className);
    } else {
        $target.removeClass(className);
    }
};

export default setScrollClassName;
