import type {Card} from '../types.js';

const hrCard: Card = {
    name: 'hr',
    type: 'dom',

    render({env: {dom}}) {
        return dom.createElement('hr');
    }
};

export default hrCard;
