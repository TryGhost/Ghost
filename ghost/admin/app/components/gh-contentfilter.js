import Component from '@glimmer/component';
import {inject as service} from '@ember/service';

export default class GhContentfilterComponent extends Component {
    @service customViews;
    @service router;
    @service session;

    calculateActionsDropdownPosition(trigger, content) {
        let {top, left, width, height} = trigger.getBoundingClientRect();
        // content.firstElementChild is required because we use .dropdown-menu which is absolute positioned
        let {width: contentWidth} = content.firstElementChild.getBoundingClientRect();

        let style = {
            left: left + width - contentWidth,
            top: top + height + 5
        };

        return {style};
    }
}
