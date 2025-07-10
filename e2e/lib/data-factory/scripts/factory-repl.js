#!/usr/bin/env node

/**
 * Interactive REPL for Ghost Data Factory
 * 
 * This provides an interactive environment to experiment with the factory
 */

const repl = require('repl');
const factory = require('../../factory');

async function startRepl() {
    console.log('Setting up Ghost Data Factory...');
    
    try {
        await factory.setupFactory({debug: true});
        console.log('Factory initialized successfully!');
        console.log('');
        console.log('Available methods:');
        console.log('  factory.create(type, options)   - Create an entity');
        console.log('  factory.posts()                 - Create a post builder');
        console.log('  factory.members()               - Create a member builder');
        console.log('  factory.resetDatabase()         - Reset all data');
        console.log('');
        console.log('Examples:');
        console.log('  await factory.posts().withTitle("My Post").asPublished().create()');
        console.log('  await factory.members().withEmail("test@example.com").create()');
        console.log('');
        
        const replServer = repl.start({
            prompt: 'ghost-factory> ',
            useColors: true
        });
        
        // Make factory available in REPL context
        replServer.context.factory = factory;
        
        // Add convenience methods
        replServer.context.create = factory.create.bind(factory);
        replServer.context.posts = factory.posts;
        replServer.context.members = factory.members;
        
        // Handle cleanup on exit
        replServer.on('exit', async () => {
            console.log('\nCleaning up...');
            await factory.cleanupFactory();
            process.exit(0);
        });
    } catch (error) {
        console.error('Failed to initialize factory:', error.message);
        process.exit(1);
    }
}

startRepl();