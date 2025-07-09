/**
 * SchemaAnalyzer provides utilities for analyzing Ghost's database schema
 * to understand relationships, constraints, and dependencies between tables.
 */
class SchemaAnalyzer {
    constructor(schemaTables) {
        if (!schemaTables) {
            throw new Error('Schema tables are required for SchemaAnalyzer');
        }
        this.tables = schemaTables;
        this._foreignKeyCache = null;
        this._dependencyCache = null;
    }

    /**
     * Get all foreign key relationships in the schema
     * @returns {Object} Map of table names to their foreign key relationships
     */
    getForeignKeys() {
        if (this._foreignKeyCache) {
            return this._foreignKeyCache;
        }

        const foreignKeys = {};
        
        for (const [tableName, tableSchema] of Object.entries(this.tables)) {
            foreignKeys[tableName] = {};
            
            for (const [columnName, columnDef] of Object.entries(tableSchema)) {
                if (columnDef.references) {
                    foreignKeys[tableName][columnName] = {
                        table: columnDef.references,
                        nullable: columnDef.nullable || false,
                        cascadeDelete: columnDef.cascadeDelete || false
                    };
                }
            }
            
            // Remove empty objects
            if (Object.keys(foreignKeys[tableName]).length === 0) {
                delete foreignKeys[tableName];
            }
        }
        
        this._foreignKeyCache = foreignKeys;
        return foreignKeys;
    }

    /**
     * Get table dependencies based on foreign key relationships
     * @returns {Object} Map of table names to tables they depend on
     */
    getTableDependencies() {
        if (this._dependencyCache) {
            return this._dependencyCache;
        }

        const dependencies = {};
        const foreignKeys = this.getForeignKeys();
        
        for (const [tableName, fks] of Object.entries(foreignKeys)) {
            dependencies[tableName] = new Set();
            
            for (const fk of Object.values(fks)) {
                // Don't include self-references as dependencies
                if (fk.table !== tableName) {
                    dependencies[tableName].add(fk.table);
                }
            }
            
            dependencies[tableName] = Array.from(dependencies[tableName]);
        }
        
        // Add tables without foreign keys
        for (const tableName of Object.keys(this.tables)) {
            if (!dependencies[tableName]) {
                dependencies[tableName] = [];
            }
        }
        
        this._dependencyCache = dependencies;
        return dependencies;
    }

    /**
     * Get columns that have foreign key references to a specific table
     * @param {string} tableName - The referenced table name
     * @returns {Array} Array of {table, column} objects that reference the given table
     */
    getReferencesTo(tableName) {
        const references = [];
        const foreignKeys = this.getForeignKeys();
        
        for (const [sourceTable, fks] of Object.entries(foreignKeys)) {
            for (const [column, fkDef] of Object.entries(fks)) {
                if (fkDef.table === tableName) {
                    references.push({
                        table: sourceTable,
                        column: column,
                        nullable: fkDef.nullable,
                        cascadeDelete: fkDef.cascadeDelete
                    });
                }
            }
        }
        
        return references;
    }

    /**
     * Check if a table has any required foreign keys
     * @param {string} tableName - The table to check
     * @returns {boolean} True if table has non-nullable foreign keys
     */
    hasRequiredDependencies(tableName) {
        const foreignKeys = this.getForeignKeys()[tableName] || {};
        
        return Object.values(foreignKeys).some(fk => !fk.nullable);
    }

    /**
     * Get all columns for a table with their definitions
     * @param {string} tableName - The table name
     * @returns {Object} Column definitions
     */
    getTableColumns(tableName) {
        return this.tables[tableName] || {};
    }

    /**
     * Get primary key column for a table
     * @param {string} tableName - The table name
     * @returns {string|null} Primary key column name
     */
    getPrimaryKey(tableName) {
        const columns = this.getTableColumns(tableName);
        
        for (const [columnName, columnDef] of Object.entries(columns)) {
            if (columnDef.primary) {
                return columnName;
            }
        }
        
        // Default to 'id' if no explicit primary key
        return columns.id ? 'id' : null;
    }

    /**
     * Get all unique columns for a table
     * @param {string} tableName - The table name
     * @returns {Array} Array of unique column names
     */
    getUniqueColumns(tableName) {
        const columns = this.getTableColumns(tableName);
        const uniqueColumns = [];
        
        for (const [columnName, columnDef] of Object.entries(columns)) {
            if (columnDef.unique) {
                uniqueColumns.push(columnName);
            }
        }
        
        return uniqueColumns;
    }

    /**
     * Get default values for a table
     * @param {string} tableName - The table name
     * @returns {Object} Map of column names to default values
     */
    getDefaultValues(tableName) {
        const columns = this.getTableColumns(tableName);
        const defaults = {};
        
        for (const [columnName, columnDef] of Object.entries(columns)) {
            if ('defaultTo' in columnDef) {
                defaults[columnName] = columnDef.defaultTo;
            }
        }
        
        return defaults;
    }

    /**
     * Check if a column is nullable
     * @param {string} tableName - The table name
     * @param {string} columnName - The column name
     * @returns {boolean} True if column is nullable
     */
    isColumnNullable(tableName, columnName) {
        const column = this.tables[tableName]?.[columnName];
        return column ? (column.nullable !== false) : true;
    }

    /**
     * Get all tables that represent many-to-many junction tables
     * @returns {Array} Array of junction table names
     */
    getJunctionTables() {
        const junctionTables = [];
        
        for (const [tableName, columns] of Object.entries(this.tables)) {
            const columnNames = Object.keys(columns);
            const foreignKeys = this.getForeignKeys()[tableName] || {};
            
            // Junction tables typically have 2-3 foreign keys and possibly sort_order
            if (Object.keys(foreignKeys).length >= 2 && columnNames.length <= 5) {
                // Check if most columns are foreign keys or common junction table fields
                const nonFkColumns = columnNames.filter(col => 
                    !foreignKeys[col] && 
                    !['id', 'sort_order', 'created_at', 'updated_at'].includes(col)
                );
                
                if (nonFkColumns.length === 0) {
                    junctionTables.push(tableName);
                }
            }
        }
        
        return junctionTables;
    }

    /**
     * Get validation rules for a column
     * @param {string} tableName - The table name
     * @param {string} columnName - The column name
     * @returns {Object|null} Validation rules or null
     */
    getColumnValidations(tableName, columnName) {
        const column = this.tables[tableName]?.[columnName];
        return column?.validations || null;
    }
}

module.exports = SchemaAnalyzer;