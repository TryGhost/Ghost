import classic from 'ember-classic-decorator';
import {classNames} from '@ember-decorators/component';
import {inject as service} from '@ember/service';
/*

Implements a div for covering the page content
when in a menu context that, for example,
should be closed when the user clicks elsewhere.

Example:
```
{{gh-content-cover}}
```
**/

import Component from '@ember/component';

@classic
@classNames('content-cover')
export default class GhContentCover extends Component {
    @service ui;

    click() {
        this.ui.closeMenus();
    }
}
