import createComponentCard from '../utils/create-component-card';

// TODO: move koenigOptions directly into cards now that card components register
// themselves so that they are available on card.component
export default [
    createComponentCard('card-markdown'), // backwards-compat with markdown editor
    createComponentCard('code', {deleteIfEmpty: 'payload.code'}),
    createComponentCard('embed', {hasEditMode: false, deleteIfEmpty: 'payload.html'}),
    createComponentCard('hr', {hasEditMode: false, selectAfterInsert: false}),
    createComponentCard('html', {deleteIfEmpty: 'payload.html'}),
    createComponentCard('image', {hasEditMode: false}),
    createComponentCard('markdown', {deleteIfEmpty: 'payload.markdown'})
];

export const CARD_MENU = [
    {
        title: 'Basic',
        items: [{
            label: 'Image',
            icon: 'koenig/image',
            matches: ['image', 'img'],
            type: 'card',
            replaceArg: 'image',
            params: ['src']
        },
        {
            label: 'Markdown',
            icon: 'koenig/markdown',
            matches: ['markdown', 'md'],
            type: 'card',
            replaceArg: 'markdown'
        },
        {
            label: 'HTML',
            icon: 'koenig/html',
            matches: ['html'],
            type: 'card',
            replaceArg: 'html'
        },
        {
            label: 'Divider',
            icon: 'koenig/divider',
            matches: ['divider', 'horizontal-rule', 'hr'],
            type: 'card',
            replaceArg: 'hr'
        }]
    },
    {
        title: 'Embed',
        items: [{
            label: 'YouTube',
            icon: 'koenig/youtube',
            matches: ['youtube'],
            type: 'card',
            replaceArg: 'embed',
            params: ['url']
        },
        {
            label: 'Twitter',
            icon: 'koenig/twitter',
            matches: ['twitter'],
            type: 'card',
            replaceArg: 'embed',
            params: ['url']
        },
        {
            label: 'Facebook',
            icon: 'koenig/facebook',
            matches: ['facebook'],
            type: 'card',
            replaceArg: 'embed',
            params: ['url']
        },
        {
            label: 'SoundCloud',
            icon: 'koenig/soundcloud',
            matches: ['soundcloud'],
            type: 'card',
            replaceArg: 'embed',
            params: ['url']
        },
        {
            label: 'CodePen',
            icon: 'koenig/codepen',
            matches: ['codepen'],
            type: 'card',
            replaceArg: 'embed',
            params: ['url']
        },
        {
            label: 'Other...',
            icon: 'koenig/code-block',
            matches: ['embed'],
            type: 'card',
            replaceArg: 'embed',
            params: ['url']
        }]
    }
];
