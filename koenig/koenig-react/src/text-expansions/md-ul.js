import replaceWithListSection from './utils/replace-with-list-section';

const mdUl = {
    unregister: ['ul'],
    register: [{
        name: 'md_ul',
        match: /^\* |^- /,
        run(editor, matches) {
            replaceWithListSection(editor, matches, 'ul');
        }
    }]
};

export default mdUl;
