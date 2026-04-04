export function lazyComponent<T extends React.ComponentType>(
    fn: () => Promise<{ default: T }>
) {
    return () => fn().then(({default: Component}) => ({
        Component
    }));
}
