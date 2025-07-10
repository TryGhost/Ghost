/**
 * DependencyResolver handles topological sorting of tables based on foreign key dependencies
 * to ensure data is created in the correct order.
 */
class DependencyResolver {
    constructor(schemaAnalyzer) {
        this.analyzer = schemaAnalyzer;
        this._sortedTablesCache = null;
    }

    /**
     * Perform topological sort on tables based on dependencies
     * @param {Array} tables - Optional subset of tables to sort
     * @returns {Array} Sorted array of table names
     */
    sortTables(tables = null) {
        // Use cache if sorting all tables
        if (!tables && this._sortedTablesCache) {
            return this._sortedTablesCache;
        }

        const dependencies = this.analyzer.getTableDependencies();
        const tablesToSort = tables || Object.keys(dependencies);
        
        // Build adjacency list for the subset of tables
        const graph = {};
        const inDegree = {};
        
        for (const table of tablesToSort) {
            graph[table] = [];
            inDegree[table] = 0;
        }
        
        // Build the graph edges
        for (const table of tablesToSort) {
            const deps = dependencies[table] || [];
            for (const dep of deps) {
                // Only include dependencies that are in our subset
                if (tablesToSort.includes(dep)) {
                    graph[dep].push(table);
                    inDegree[table]++;
                }
            }
        }
        
        // Kahn's algorithm for topological sort
        const queue = [];
        const sorted = [];
        
        // Find all nodes with no incoming edges
        for (const table of tablesToSort) {
            if (inDegree[table] === 0) {
                queue.push(table);
            }
        }
        
        while (queue.length > 0) {
            const current = queue.shift();
            sorted.push(current);
            
            // Process all neighbors
            for (const neighbor of graph[current]) {
                inDegree[neighbor]--;
                if (inDegree[neighbor] === 0) {
                    queue.push(neighbor);
                }
            }
        }
        
        // Check for cycles
        if (sorted.length !== tablesToSort.length) {
            const remaining = tablesToSort.filter(t => !sorted.includes(t));
            throw new Error(`Circular dependency detected involving tables: ${remaining.join(', ')}`);
        }
        
        // Cache if we sorted all tables
        if (!tables) {
            this._sortedTablesCache = sorted;
        }
        
        return sorted;
    }

    /**
     * Get the minimum set of tables required to create an entity of a given type
     * @param {string} targetTable - The table we want to create data for
     * @param {Object} options - Options for dependency resolution
     * @returns {Array} Ordered array of tables that need to be populated
     */
    getRequiredTables(targetTable, options = {}) {
        const {
            includeOptional = false,
            maxDepth = 10
        } = options;

        const required = new Set();
        const visited = new Set();
        
        const traverse = (table, depth = 0) => {
            if (visited.has(table) || depth > maxDepth) {
                return;
            }
            
            visited.add(table);
            required.add(table);
            
            const foreignKeys = this.analyzer.getForeignKeys()[table] || {};
            
            for (const [, fkDef] of Object.entries(foreignKeys)) {
                // Skip self-references
                if (fkDef.table === table) {
                    continue;
                }
                
                // Include if required or if includeOptional is true
                if (!fkDef.nullable || includeOptional) {
                    traverse(fkDef.table, depth + 1);
                }
            }
        };
        
        traverse(targetTable);
        
        // Sort the required tables
        return this.sortTables(Array.from(required));
    }

    /**
     * Get tables that depend on a given table
     * @param {string} tableName - The table to check dependencies for
     * @returns {Array} Array of table names that depend on the given table
     */
    getDependentTables(tableName) {
        const references = this.analyzer.getReferencesTo(tableName);
        const dependents = new Set();
        
        for (const ref of references) {
            dependents.add(ref.table);
        }
        
        return Array.from(dependents);
    }

    /**
     * Check if creating an entry in tableA requires an entry in tableB
     * @param {string} tableA - The table we want to create data in
     * @param {string} tableB - The table we're checking as a dependency
     * @returns {boolean} True if tableA requires tableB
     */
    requiresTable(tableA, tableB) {
        const foreignKeys = this.analyzer.getForeignKeys()[tableA] || {};
        
        for (const fkDef of Object.values(foreignKeys)) {
            if (fkDef.table === tableB && !fkDef.nullable) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Get a dependency tree for visualization or debugging
     * @param {string} rootTable - The root table to start from
     * @param {number} maxDepth - Maximum depth to traverse
     * @returns {Object} Tree structure of dependencies
     */
    getDependencyTree(rootTable, maxDepth = 5) {
        const buildTree = (table, depth = 0, visited = new Set()) => {
            if (depth >= maxDepth || visited.has(table)) {
                return {table, circular: visited.has(table)};
            }
            
            visited.add(table);
            
            const node = {
                table,
                required: [],
                optional: []
            };
            
            const foreignKeys = this.analyzer.getForeignKeys()[table] || {};
            
            for (const [column, fkDef] of Object.entries(foreignKeys)) {
                if (fkDef.table === table) continue; // Skip self-references
                
                const childNode = buildTree(fkDef.table, depth + 1, new Set(visited));
                childNode.column = column;
                
                if (fkDef.nullable) {
                    node.optional.push(childNode);
                } else {
                    node.required.push(childNode);
                }
            }
            
            return node;
        };
        
        return buildTree(rootTable);
    }

    /**
     * Find the shortest path of required tables between two tables
     * @param {string} fromTable - Starting table
     * @param {string} toTable - Target table
     * @returns {Array|null} Array of tables in the path, or null if no path exists
     */
    findPath(fromTable, toTable) {
        if (fromTable === toTable) {
            return [fromTable];
        }
        
        const queue = [[fromTable]];
        const visited = new Set([fromTable]);
        
        while (queue.length > 0) {
            const path = queue.shift();
            const current = path[path.length - 1];
            
            const foreignKeys = this.analyzer.getForeignKeys()[current] || {};
            
            for (const fkDef of Object.values(foreignKeys)) {
                if (!visited.has(fkDef.table)) {
                    const newPath = [...path, fkDef.table];
                    
                    if (fkDef.table === toTable) {
                        return newPath;
                    }
                    
                    visited.add(fkDef.table);
                    queue.push(newPath);
                }
            }
        }
        
        return null;
    }
}

module.exports = DependencyResolver;