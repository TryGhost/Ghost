const crypto = require('crypto');
const SchemaAnalyzer = require('./schema/analyzer');
const DependencyResolver = require('./schema/dependencies');

/**
 * BaseFactory provides core functionality for all entity factories
 */
class BaseFactory {
    constructor(knex, schema, options = {}) {
        if (!knex) {
            throw new Error('Database connection (knex) is required');
        }
        if (!schema) {
            throw new Error('Schema is required');
        }
        
        this.knex = knex;
        this.schema = schema;
        this.analyzer = new SchemaAnalyzer(schema);
        this.resolver = new DependencyResolver(this.analyzer);
        this.transaction = options.transaction;
        this.transactionOwner = false;
    }

    /**
     * Get or create a transaction
     */
    async getTransaction() {
        if (!this.transaction) {
            this.transaction = await this.knex.transaction();
            this.transactionOwner = true;
        }
        return this.transaction;
    }

    /**
     * Commit transaction if we own it
     */
    async commit() {
        if (this.transactionOwner && this.transaction) {
            await this.transaction.commit();
            this.transaction = null;
            this.transactionOwner = false;
        }
    }

    /**
     * Rollback transaction if we own it
     */
    async rollback() {
        if (this.transactionOwner && this.transaction) {
            await this.transaction.rollback();
            this.transaction = null;
            this.transactionOwner = false;
        }
    }

    /**
     * Generate a Ghost-compatible ObjectId
     */
    generateId() {
        const timestamp = Math.floor(Date.now() / 1000).toString(16);
        const machineId = crypto.randomBytes(3).toString('hex');
        const processId = crypto.randomBytes(2).toString('hex');
        const counter = crypto.randomBytes(3).toString('hex');
        
        return timestamp + machineId + processId + counter;
    }

    /**
     * Generate a URL-safe slug
     */
    generateSlug(text) {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 191);
    }

    /**
     * Format date for database
     */
    dateToDatabase(date) {
        if (!date) return null;
        if (typeof date === 'string') return date;
        return date.toISOString().slice(0, 19).replace('T', ' ');
    }

    /**
     * Apply default values from schema
     */
    applyDefaults(tableName, data) {
        const defaults = this.analyzer.getDefaultValues(tableName);
        const result = {...data};
        
        for (const [column, defaultValue] of Object.entries(defaults)) {
            if (!(column in result)) {
                result[column] = defaultValue;
            }
        }
        
        return result;
    }

    /**
     * Validate required fields
     */
    validateRequired(tableName, data) {
        const columns = this.analyzer.getTableColumns(tableName);
        const errors = [];
        
        for (const [columnName, columnDef] of Object.entries(columns)) {
            // Skip if nullable or has default
            if (columnDef.nullable !== false || 'defaultTo' in columnDef) {
                continue;
            }
            
            // Check if field is provided
            if (!(columnName in data) || data[columnName] === null || data[columnName] === undefined) {
                errors.push(`Missing required field: ${columnName}`);
            }
        }
        
        if (errors.length > 0) {
            throw new Error(`Validation failed for ${tableName}: ${errors.join(', ')}`);
        }
    }

    /**
     * Insert data with schema awareness
     */
    async insert(tableName, data) {
        const trx = await this.getTransaction();
        
        // Apply defaults
        const dataWithDefaults = this.applyDefaults(tableName, data);
        
        // Add ID if not provided
        const primaryKey = this.analyzer.getPrimaryKey(tableName);
        if (primaryKey && !dataWithDefaults[primaryKey]) {
            dataWithDefaults[primaryKey] = this.generateId();
        }
        
        // Add timestamps if not provided
        const now = this.dateToDatabase(new Date());
        if ('created_at' in this.analyzer.getTableColumns(tableName) && !dataWithDefaults.created_at) {
            dataWithDefaults.created_at = now;
        }
        if ('updated_at' in this.analyzer.getTableColumns(tableName) && !dataWithDefaults.updated_at) {
            dataWithDefaults.updated_at = now;
        }
        
        // Validate required fields
        this.validateRequired(tableName, dataWithDefaults);
        
        // Insert and return the full record
        await trx(tableName).insert(dataWithDefaults);
        
        // Return the inserted record
        const insertedRecord = await trx(tableName)
            .where(primaryKey, dataWithDefaults[primaryKey])
            .first();
            
        return insertedRecord;
    }

    /**
     * Find or create a record
     */
    async findOrCreate(tableName, findBy, createData = {}) {
        const trx = await this.getTransaction();
        
        // Try to find existing record
        const existing = await trx(tableName).where(findBy).first();
        if (existing) {
            return existing;
        }
        
        // Create new record
        const data = {...findBy, ...createData};
        return this.insert(tableName, data);
    }

    /**
     * Create multiple records
     */
    async insertMany(tableName, dataArray) {
        const results = [];
        
        for (const data of dataArray) {
            const result = await this.insert(tableName, data);
            results.push(result);
        }
        
        return results;
    }

    /**
     * Get a random record from a table
     */
    async getRandomRecord(tableName, where = {}) {
        const trx = await this.getTransaction();
        
        const records = await trx(tableName).where(where).select('*');
        if (records.length === 0) {
            return null;
        }
        
        return records[Math.floor(Math.random() * records.length)];
    }

    /**
     * Count records in a table
     */
    async count(tableName, where = {}) {
        const trx = await this.getTransaction();
        
        const result = await trx(tableName)
            .where(where)
            .count('* as count')
            .first();
            
        return parseInt(result.count);
    }

    /**
     * Clean up created data (for testing)
     */
    async cleanup(tableName, where = {}) {
        const trx = await this.getTransaction();
        await trx(tableName).where(where).delete();
    }
    
    /**
     * Reset the database to a clean state
     * Alias for resetDatabase with all tables
     */
    async resetDb() {
        // This method should be implemented by DataFactory
        // which has the reset logic
        throw new Error('resetDb must be implemented by subclass');
    }
    
    /**
     * Close database connection
     */
    async destroy() {
        // Commit or rollback any open transaction
        if (this.transaction) {
            if (this.transactionOwner) {
                await this.transaction.rollback();
            }
            this.transaction = null;
        }
        
        // Close the database connection
        await this.knex.destroy();
    }
}

module.exports = BaseFactory;