import Component from '@ember/component';
import {htmlSafe} from '@ember/template';

export default Component.extend({
    tagName: 'a',
    anchor: '',
    classNames: ['sr-only', 'sr-only-focusable'],
    // Add attributes to component for href
    // href should be set to retain anchor properties
    // such as pointer cursor and text underline
    attributeBindings: ['href'],
    // Used so that upon clicking on the link
    // anchor behaviors or ignored
    href: htmlSafe('javascript:;'),

    click() {
        let el = document.querySelector(this.anchor);

        if (el) {
            // Scrolls to the top of main content or whatever
            // is passed to the anchor attribute
            document.body.scrollTop = el.getBoundingClientRect().top;

            let removeTabindex = function () {
                el.removeAttribute('tabindex');
            };

            // This sets focus on the content which was skipped to
            // upon losing focus, the tabindex should be removed
            // so that normal keyboard navigation picks up from focused
            // element
            el.setAttribute('tabindex', -1);
            el.focus();
            el.addEventListener('blur', removeTabindex);
            el.addEventListener('focusout', removeTabindex);
        }
    }
});
