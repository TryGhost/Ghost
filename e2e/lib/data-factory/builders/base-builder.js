const {faker} = require('@faker-js/faker');

/**
 * BaseBuilder provides a fluent interface for building entities
 */
class BaseBuilder {
    constructor(factory, tableName) {
        this.factory = factory;
        this.tableName = tableName;
        this.data = {};
        this.relations = {};
        this.postCreateHooks = [];
    }

    /**
     * Set a field value
     */
    set(field, value) {
        this.data[field] = value;
        return this;
    }

    /**
     * Set multiple field values
     */
    setMany(data) {
        Object.assign(this.data, data);
        return this;
    }

    /**
     * Set a relation
     */
    withRelation(relationName, value) {
        this.relations[relationName] = value;
        return this;
    }

    /**
     * Add a post-create hook
     */
    afterCreate(hook) {
        this.postCreateHooks.push(hook);
        return this;
    }

    /**
     * Generate default values for common fields
     */
    generateDefaults() {
        const defaults = {};
        const columns = this.factory.analyzer.getTableColumns(this.tableName);
        
        // Generate defaults based on column names and types
        for (const [columnName, columnDef] of Object.entries(columns)) {
            // Skip if already provided or has schema default
            if (columnName in this.data || 'defaultTo' in columnDef) {
                continue;
            }
            
            // Generate based on column name patterns
            if (columnName === 'uuid') {
                defaults[columnName] = faker.datatype.uuid();
            } else if (columnName === 'email') {
                defaults[columnName] = faker.internet.email().toLowerCase();
            } else if (columnName === 'name') {
                defaults[columnName] = faker.name.fullName();
            } else if (columnName === 'title') {
                defaults[columnName] = faker.lorem.sentence();
            } else if (columnName === 'slug' && this.data.title) {
                defaults[columnName] = this.factory.generateSlug(this.data.title);
            } else if (columnName === 'slug' && this.data.name) {
                defaults[columnName] = this.factory.generateSlug(this.data.name);
            } else if (columnName.endsWith('_at') && columnDef.type === 'dateTime') {
                // Don't generate dates for timestamp fields - let schema handle it
                continue;
            }
        }
        
        return defaults;
    }

    /**
     * Resolve foreign key dependencies
     */
    async resolveDependencies() {
        const foreignKeys = this.factory.analyzer.getForeignKeys()[this.tableName] || {};
        
        for (const [columnName, fkDef] of Object.entries(foreignKeys)) {
            // Skip if already provided
            if (columnName in this.data) {
                continue;
            }
            
            // Skip nullable foreign keys unless explicitly requested
            if (fkDef.nullable && !(columnName in this.relations)) {
                continue;
            }
            
            // Check if we have a relation for this FK
            const relationKey = columnName.replace(/_id$/, '');
            if (this.relations[relationKey]) {
                this.data[columnName] = this.relations[relationKey];
            } else if (!fkDef.nullable) {
                // For required FKs, try to find an existing record
                const existingRecord = await this.factory.getRandomRecord(fkDef.table);
                if (existingRecord) {
                    const primaryKey = this.factory.analyzer.getPrimaryKey(fkDef.table);
                    this.data[columnName] = existingRecord[primaryKey];
                } else {
                    throw new Error(
                        `Cannot create ${this.tableName}: required foreign key ${columnName} ` +
                        `references ${fkDef.table} but no records exist. ` +
                        `Please create a ${fkDef.table} record first.`
                    );
                }
            }
        }
    }

    /**
     * Build and insert the entity
     */
    async create() {
        try {
            // Generate defaults
            const defaults = this.generateDefaults();
            
            // Merge defaults with provided data (provided data takes precedence)
            this.data = {...defaults, ...this.data};
            
            // Resolve foreign key dependencies
            await this.resolveDependencies();
            
            // Insert the record
            const record = await this.factory.insert(this.tableName, this.data);
            
            // Run post-create hooks
            for (const hook of this.postCreateHooks) {
                await hook(record);
            }
            
            // Commit if we own the transaction
            await this.factory.commit();
            
            return record;
        } catch (error) {
            // Rollback on error
            await this.factory.rollback();
            throw error;
        }
    }

    /**
     * Build without inserting (returns data object)
     */
    build() {
        const defaults = this.generateDefaults();
        return {...defaults, ...this.data};
    }
}

module.exports = BaseBuilder;