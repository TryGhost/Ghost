import type {ReadonlyDeep} from 'type-fest';

type TopologicalSortable = ReadonlyDeep<{
    name: string;
    dependencies?: string[];
}>;

/**
 * This sorting algorithm is used to make sure that dependent tables are imported after their dependencies.
 */
export function topologicalSort<T extends TopologicalSortable>(objects: ReadonlyArray<T>): T[] {
    // Create an empty result array to store the ordered objects
    const result: T[] = [];
    // Create a set to track visited objects during the DFS
    const visited = new Set<string>();
    const objectsByName = new Map<string, T>();

    for (const object of objects) {
        objectsByName.set(object.name, object);
    }

    // Helper function to perform DFS
    function dfs(name: string): void {
        if (visited.has(name)) {
            return;
        }

        const object = objectsByName.get(name);
        if (!object) {
            return;
        }

        visited.add(name);

        for (const dependency of object.dependencies || []) {
            dfs(dependency);
        }

        result.push(object);
    }

    // Perform DFS on each object
    for (const object of objects) {
        dfs(object.name);
    }

    return result;
}
