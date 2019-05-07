import {helper} from '@ember/component/helper';

export function subscribersQueryParams([order, currentOrder, direction]) {
    // if order hasn't changed we toggle the direction
    if (order === currentOrder) {
        direction = direction === 'asc' ? 'desc' : 'asc';
    }

    return [
        'subscribers',
        {
            isQueryParams: true,
            values: {
                order,
                direction
            }
        }
    ];
}

export default helper(subscribersQueryParams);
