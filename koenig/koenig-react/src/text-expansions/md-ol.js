import replaceWithListSection from './utils/replace-with-list-section';

const mdOl = (koenig) => {
    return {
        unregister: ['ol'],
        register: [{
            name: 'md_ol',
            match: /^1\.? /,
            run(editor, matches) {
                replaceWithListSection(editor, matches, 'ol');
            }
        }]
    };
};

export default mdOl;
