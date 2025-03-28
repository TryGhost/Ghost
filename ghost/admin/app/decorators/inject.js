import {computed, defineProperty} from '@ember/object';
import {getOwner} from '@ember/application';

function isElementDescriptor(args) {
    let [maybeTarget, maybeKey, maybeDesc] = args;

    return (
        // Ensure we have the right number of args
        args.length === 3 &&
        // Make sure the target is a class or object (prototype)
        (typeof maybeTarget === 'function' ||
            (typeof maybeTarget === 'object' && maybeTarget !== null)) &&
        // Make sure the key is a string
        typeof maybeKey === 'string' &&
        // Make sure the descriptor is the right shape
        ((typeof maybeDesc === 'object' && maybeDesc !== null) || maybeDesc === undefined)
    );
}

export function inject(...args) {
    let elementDescriptor;
    let name;

    if (isElementDescriptor(args)) {
        elementDescriptor = args;
    } else if (typeof args[0] === 'string') {
        name = args[0];
    }

    const getInjection = function (propertyName) {
        const owner = getOwner(this) || this.container;
        return owner.lookup(`${name || propertyName}:main`);
    };

    const decorator = computed({
        get: getInjection,
        set(keyName, value) {
            defineProperty(this, keyName, null, value);
            return;
        }
    });

    if (elementDescriptor) {
        return decorator(elementDescriptor[0], elementDescriptor[1], elementDescriptor[2]);
    } else {
        return decorator;
    }
}
