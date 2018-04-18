import createComponentCard from '../utils/create-component-card';

export default [
    createComponentCard('hr', {hasEditMode: false, selectAfterInsert: false}),
    createComponentCard('image', {hasEditMode: false}),
    createComponentCard('markdown'),
    createComponentCard('card-markdown'), // backwards-compat with markdown editor
    createComponentCard('html')
];
