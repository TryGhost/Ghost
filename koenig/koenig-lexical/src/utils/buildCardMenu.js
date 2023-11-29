import SnippetCardIcon from '../assets/icons/kg-card-type-snippet.svg?react';
import {INSERT_SNIPPET_COMMAND} from '../plugins/KoenigSnippetPlugin';

export function buildCardMenu(nodes, {query, config} = {}) {
    let menu = new Map();

    query = query?.toLowerCase();

    let maxItemIndex = -1;

    function addMenuItem(item) {
        // items hidden based on missing config (e.g. Tenor API key for gif card)
        if (!!item.isHidden && item.isHidden?.({config})) {
            return;
        }

        // items restricted for posts vs. pages (e.g. email CTA card)
        if (item.postType && config?.post?.displayName && item.postType !== config?.post?.displayName) {
            return;
        }

        const matches = typeof item?.matches === 'function'
            ? item?.matches?.(query, item.label)
            : item?.matches?.find?.(m => m.startsWith(query));

        if (query && !matches) {
            return;
        }

        if (typeof item.insertParams === 'function') {
            item.insertParams = item.insertParams({config});
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

    // sort each menu section by priority
    menu = new Map([...menu.entries()].map(([section, items]) => {
        return [section, items.sort((a, b) => {
            if (a.priority === b.priority) {
                return 0;
            } else if (a.priority === undefined) {
                return 1;
            } else if (b.priority === undefined) {
                return -1;
            } else {
                return a.priority - b.priority;
            }
        })];
    }));

    // sort primary section to always display first
    menu = new Map([...menu.entries()].sort((a, b) => {
        if (a[0] === 'Primary') {
            return -1;
        } else {
            return 1;
        }
    }));

    return {menu, maxItemIndex};
}

function buildSnippetMenuItem(data, config) {
    const name = data.name.toLowerCase();
    const snippet = {
        type: 'snippet',
        label: data.name,
        Icon: SnippetCardIcon,
        section: 'Snippets',
        matches: query => name.indexOf(query) > -1 || 'snippets'.indexOf(query) > -1,
        insertCommand: INSERT_SNIPPET_COMMAND,
        insertParams: data,
        onRemove: () => config.deleteSnippet(data)
    };

    return snippet;
}
