const fs = require('fs/promises');
const path = require('path');
const i18n = require('../');
const {checkTranslationPair} = require('./utils');

async function removeUnneededIgnores() {
    // Load existing ignores
    let existingIgnores = {
        overrides: {
            addedVariable: [],
            missingVariable: []
        }
    };
    
    try {
        const existingContent = await fs.readFile(path.join(__dirname, 'i18n-ignores.json'), 'utf8');
        existingIgnores = JSON.parse(existingContent);
    } catch (error) {
        console.log('No existing ignores file found');
        return;
    }

    const keptIgnores = {
        overrides: {
            addedVariable: [],
            missingVariable: []
        }
    };

    // Process each existing ignore entry
    for (const issueType of ['addedVariable', 'missingVariable']) {
        for (const entry of existingIgnores.overrides[issueType]) {
            const [locale, file] = entry.file.split('/');
            
            try {
                const translationFile = require(path.join(__dirname, `../locales/`, locale, file));
                const value = translationFile[entry.key];
                
                if (value) {
                    const issues = checkTranslationPair(entry.key, value);
                    
                    // Only keep the ignore if the issue still exists
                    if (issues.includes(issueType)) {
                        keptIgnores.overrides[issueType].push(entry);
                    }
                }
            } catch (error) {
                // If we can't find the file or key, keep the ignore
                keptIgnores.overrides[issueType].push(entry);
            }
        }
    }

    // Write the updated ignores file
    await fs.writeFile(
        path.join(__dirname, 'i18n-ignores.json'),
        JSON.stringify(keptIgnores, null, 4)
    );

    // Log summary of changes
    const removedCount = {
        addedVariable: existingIgnores.overrides.addedVariable.length - keptIgnores.overrides.addedVariable.length,
        missingVariable: existingIgnores.overrides.missingVariable.length - keptIgnores.overrides.missingVariable.length
    };

    console.log('Removed unneeded ignores:');
    console.log(`- Added variable ignores removed: ${removedCount.addedVariable}`);
    console.log(`- Missing variable ignores removed: ${removedCount.missingVariable}`);
}

// Run the cleanup
removeUnneededIgnores();
