/*

Implements a div for covering the page content
when in a menu context that, for example,
should be closed when the user clicks elsewhere.

Example:
```
{{gh-content-cover}}
```
**/

import Component from 'ember-component';
import {inject as injectService} from '@ember/service';

export default Component.extend({
    ui: injectService(),

    classNames: ['content-cover'],

    onMouseEnter: null,

    click() {
        this.get('ui').closeMenus();
    },

    mouseEnter() {
        this.get('ui').closeAutoNav();
    }
});
