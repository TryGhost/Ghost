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

    return {menu, maxItemIndex};
}
