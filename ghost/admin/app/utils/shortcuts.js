const cache = {};

export function includes(event) {
    const keys = [];
    let ctrlPressed = false;

    if (event.ctrlKey) {
        keys.push('ctrl');
        ctrlPressed = true;
    }

    if (event.shiftKey) {
        keys.push('shift');
    }

    if (event.altKey) {
        keys.push('alt');
    }

    keys.push(event.key);

    const exists = cache[keys.join('+')];

    if (!exists && ctrlPressed) { // Test things like cmd+s
        return cache[keys.join('+').replace('ctrl', 'cmd')];
    }

    return exists;
}

export function register(shortcut) {
    cache[shortcut.toLowerCase()] = true;
}

export function unregister(shortcut) {
    delete cache[shortcut];
}

export function getAll() {
    return Object.assign({}, cache);
}
