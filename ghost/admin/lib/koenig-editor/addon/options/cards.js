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
        title: 'Primary',
        items: [{
            label: 'Image',
            icon: 'koenig/kg-card-type-image',
            iconClass: 'kg-card-type-native',
            matches: ['image', 'img'],
            type: 'card',
            replaceArg: 'image',
            params: ['src']
        },
        {
            label: 'Markdown',
            icon: 'koenig/kg-card-type-markdown',
            iconClass: 'kg-card-type-native',
            matches: ['markdown', 'md'],
            type: 'card',
            replaceArg: 'markdown'
        },
        {
            label: 'HTML',
            icon: 'koenig/kg-card-type-html',
            iconClass: 'kg-card-type-native',
            matches: ['html'],
            type: 'card',
            replaceArg: 'html'
        },
        {
            label: 'Divider',
            icon: 'koenig/kg-card-type-divider',
            iconClass: 'kg-card-type-native',
            matches: ['divider', 'horizontal-rule', 'hr'],
            type: 'card',
            replaceArg: 'hr'
        }]
    },
    {
        title: 'Embed',
        items: [{
            label: 'YouTube',
            icon: 'koenig/kg-card-type-youtube',
            matches: ['youtube'],
            type: 'card',
            replaceArg: 'embed',
            params: ['url']
        },
        {
            label: 'Twitter',
            icon: 'koenig/kg-card-type-twitter',
            matches: ['twitter'],
            type: 'card',
            replaceArg: 'embed',
            params: ['url']
        },
        {
            label: 'Facebook',
            icon: 'koenig/kg-card-type-facebook',
            matches: ['facebook'],
            type: 'card',
            replaceArg: 'embed',
            params: ['url']
        },
        {
            label: 'Instagram',
            icon: 'koenig/kg-card-type-instagram',
            matches: ['instagram'],
            type: 'card',
            replaceArg: 'embed',
            params: ['url']
        },
        {
            label: 'Unsplash',
            icon: 'koenig/kg-card-type-unsplash',
            iconClass: 'kg-card-type-unsplash',
            matches: ['unsplash'],
            type: 'card',
            replaceArg: 'embed',
            params: ['url']
        },
        {
            label: 'Vimeo',
            icon: 'koenig/kg-card-type-vimeo',
            matches: ['vimeo'],
            type: 'card',
            replaceArg: 'embed',
            params: ['url']
        },
        {
            label: 'CodePen',
            icon: 'koenig/kg-card-type-codepen',
            iconClass: 'kg-card-type-codepen',
            matches: ['codepen'],
            type: 'card',
            replaceArg: 'embed',
            params: ['url']
        },
        {
            label: 'SoundCloud',
            icon: 'koenig/kg-card-type-soundcloud',
            matches: ['soundcloud'],
            type: 'card',
            replaceArg: 'embed',
            params: ['url']
        },
        {
            label: 'Other...',
            icon: 'koenig/kg-card-type-other',
            iconClass: 'kg-card-type-native',
            matches: ['embed'],
            type: 'card',
            replaceArg: 'embed',
            params: ['url']
        }]
    }
];
