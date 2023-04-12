import {INSERT_SNIPPET_COMMAND} from '../plugins/KoenigSnippetPlugin';
import {ReactComponent as SnippetCardIcon} from '../assets/icons/kg-card-type-snippet.svg';

export function buildCardMenu(nodes, {query, config} = {}) {
    const menu = new Map();

    query = query?.toLowerCase();

    let maxItemIndex = -1;

    function addMenuItem(item) {
        if (!!item.isHidden && item.isHidden?.({config})) {
            return;
        }

        if (query && (!item.matches || !item.matches.find(m => m.startsWith(query)))) {
            return;
        }

        const section = item.section || 'Primary';

        if (!menu.has(section)) {
            menu.set(section, [item]);
        } else {
            menu.get(section).push(item);
        }

        maxItemIndex = maxItemIndex + 1;
    }

    for (const [nodeType, node] of nodes) {
        if (Array.isArray(node.kgMenu)) {
            node.kgMenu.forEach(item => addMenuItem({nodeType, ...item}));
        } else {
            addMenuItem({nodeType, ...node.kgMenu});
        }
    }

    config?.snippets?.forEach((item) => {
        const snippetMenuItem = buildSnippetMenuItem(item, config);
        addMenuItem(snippetMenuItem);
    });

    return {menu, maxItemIndex};
}

function buildSnippetMenuItem(data, config) {
    const name = data.name.toLowerCase();
    const snippet = {
        type: 'snippet',
        label: data.name,
        Icon: SnippetCardIcon,
        section: 'Snippets',
        matches: [name],
        insertCommand: INSERT_SNIPPET_COMMAND,
        insertParams: data,
        onRemove: () => config.deleteSnippet(data.name)
    };

    return snippet;
}
