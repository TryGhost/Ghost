/**
 * This sorting algorithm is used to make sure that dependent tables are imported after their dependencies.
 * @param {Array<Object>} objects Objects with a name and dependencies properties
 * @returns Topologically sorted array of objects
 */
module.exports = function topologicalSort(objects) {
    // Create an empty result array to store the ordered objects
    const result = [];
    // Create a set to track visited objects during the DFS
    const visited = new Set();

    // Helper function to perform DFS
    function dfs(name) {
        if (visited.has(name)) {
            return;
        }

        visited.add(name);
        const dependencies = objects.find(item => item.name === name)?.dependencies || [];
        for (const dependency of dependencies) {
            dfs(dependency);
        }

        result.push(objects.find(item => item.name === name));
    }

    // Perform DFS on each object
    for (const object of objects) {
        dfs(object.name);
    }

    return result;
};
