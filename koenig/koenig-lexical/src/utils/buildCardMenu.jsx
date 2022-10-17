import {
    CardMenu,
    CardMenuSection,
    CardMenuItem
} from '../components/CardMenu/CardMenu';

export function buildCardMenu(editor) {
    const menu = new Map();
    menu.set('Primary', []);

    function addMenuItem(item) {
        const section = item.section || 'Primary';

        if (!menu.has(section)) {
            menu.set(section, [item]);
        } else {
            menu.get(section).push(item);
        }
    }

    const nodes = editor._nodes;
    for (const [nodeType, {klass}] of nodes) {
        if (!klass.kgMenu) {
            continue;
        }

        if (Array.isArray(klass.kgMenu)) {
            klass.kgMenu.forEach(item => addMenuItem({nodeType, ...item}));
        } else {
            addMenuItem({nodeType, ...klass.kgMenu});
        }
    }

    const menuComponents = [];

    menu.forEach((items, section) => {
        menuComponents.push(<CardMenuSection key={section} label={section} />);
        items.forEach((item) => {
            menuComponents.push(<CardMenuItem key={`${section}-${item.label}`} label={item.label} desc={item.desc} Icon={item.Icon} />);
        });
    });

    return (
        <CardMenu>
            {menuComponents}
        </CardMenu>
    );
}
