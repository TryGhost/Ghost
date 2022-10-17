import {
    CardMenu,
    CardMenuSection,
    CardMenuItem
} from '../components/CardMenu';

export function buildCardMenu(editor, {afterInsert} = {}) {
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

    // browsers will move focus on mouseDown but we don't want that because it
    // removes focus from the editor meaning key commands don't work as
    // expected after a card is inserted
    const preventMouseDown = (event) => {
        event.preventDefault();
    };

    menu.forEach((items, section) => {
        menuComponents.push(<CardMenuSection key={section} label={section} />);

        items.forEach((item) => {
            const onClick = (event) => {
                event.preventDefault();
                editor.dispatchCommand(item.insertCommand);
                afterInsert?.();
            };

            menuComponents.push(<CardMenuItem key={`${section}-${item.label}`} label={item.label} desc={item.desc} Icon={item.Icon} onMouseDown={preventMouseDown} onClick={onClick} />);
        });
    });

    return (
        <CardMenu>
            {menuComponents}
        </CardMenu>
    );
}
