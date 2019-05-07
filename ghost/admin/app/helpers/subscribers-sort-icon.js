import {helper} from '@ember/component/helper';
import {svgJar} from './svg-jar';

export function subscribersSortIcon([order, currentOrder, direction]) {
    if (order === currentOrder) {
        if (direction === 'asc') {
            return svgJar('arrow-up', {class: 'ih2 mr2'});
        } else {
            return svgJar('arrow-down', {class: 'ih2 mr2'});
        }
    }
}

export default helper(subscribersSortIcon);
