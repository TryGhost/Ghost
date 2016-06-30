/*

Implements a div for covering the page content
when in a menu context that, for example,
should be closed when the user clicks elsewhere.

Example:
```
{{gh-content-cover onClick="closeMenus" onMouseEnter="closeAutoNav"}}
```
**/

import Component from 'ember-component';

export default Component.extend({
    classNames: ['content-cover'],

    onClick: null,
    onMouseEnter: null,

    click() {
        this.sendAction('onClick');
    },

    mouseEnter() {
        this.sendAction('onMouseEnter');
    }
});
