import $ from 'jquery';
import Component from '@ember/component';
import {htmlSafe} from '@ember/string';

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
        let anchor = this.get('anchor');
        let $el = $(anchor);

        if ($el) {
            // Scrolls to the top of main content or whatever
            // is passed to the anchor attribute
            $('body').scrollTop($el.offset().top);

            // This sets focus on the content which was skipped to
            // upon losing focus, the tabindex should be removed
            // so that normal keyboard navigation picks up from focused
            // element
            $($el).attr('tabindex', -1).on('blur focusout', function () {
                $(this).removeAttr('tabindex');
            }).focus();
        }
    }
});
