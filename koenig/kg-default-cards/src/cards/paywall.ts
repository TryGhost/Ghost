import type {Card} from '../types.js';

const paywallCard: Card = {
    name: 'paywall',
    type: 'dom',

    render({env: {dom}}) {
        return dom.createComment('members-only');
    }
};

export default paywallCard;
