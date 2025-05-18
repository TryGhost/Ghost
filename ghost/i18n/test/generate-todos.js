const fs = require('fs/promises');
const path = require('path');
const i18n = require('../');
const {checkTranslationPair} = require('./utils');

async function generateTodos() {
    // Load existing todos if they exist
    let existingTodos = {
        overrides: {
            addedVariable: [],
            missingVariable: []
        }
    };
    
    try {
        const existingContent = await fs.readFile(path.join(__dirname, 'i18n-todos.json'), 'utf8');
        existingTodos = JSON.parse(existingContent);
    } catch (error) {
        // If file doesn't exist or is invalid, we'll start fresh
    }

    const newTodos = {
        overrides: {
            addedVariable: [],
            missingVariable: []
        }
    };

    // Create a map of existing entries for quick lookup
    const existingEntries = new Map();
    for (const issueType of ['addedVariable', 'missingVariable']) {
        for (const entry of existingTodos.overrides[issueType]) {
            const key = `${entry.file}:${entry.key}`;
            existingEntries.set(key, {issueType, entry});
        }
    }

    for (const locale of i18n.SUPPORTED_LOCALES) {
        const translationFiles = await fs.readdir(path.join(__dirname, `../locales/`, locale));

        for (const file of translationFiles) {
            const translationFile = require(path.join(__dirname, `../locales/`, locale, file));
            
            for (const key of Object.keys(translationFile)) {
                const value = translationFile[key];
                const issues = checkTranslationPair(key, value);
                const filePath = `${locale}/${file}`;
                
                if (issues.length > 0) {
                    for (const issue of issues) {
                        const entryKey = `${filePath}:${key}`;
                        const existingEntry = existingEntries.get(entryKey);
                        
                        if (existingEntry && existingEntry.issueType === issue) {
                            // Keep the existing entry with its original comment
                            newTodos.overrides[issue].push(existingEntry.entry);
                        } else {
                            // Add new entry
                            newTodos.overrides[issue].push({
                                file: filePath,
                                key: key,
                                comment: `Auto-generated: ${issue} detected in translation`
                            });
                        }
                    }
                }
            }
        }
    }

    // Write the todos file
    await fs.writeFile(
        path.join(__dirname, 'i18n-todos.json'),
        JSON.stringify(newTodos, null, 4)
    );
}

// Run the generator
generateTodos();
