function extractVariables(str) {
    if (!str) {
        return new Set();
    }
    const regex = /\{([^}]+)\}/g;
    const variables = new Set();
    let match;
    while ((match = regex.exec(str)) !== null) {
        variables.add(match[1]);
    }
    return variables;
}

function checkTranslationPair(key, value) {
    let result = [];
    // Skip checking if value is an empty string
    if (value === '') {
        return result;
    }

    if (typeof key !== 'string') {
        return result;
    }

    const keyVars = extractVariables(key);
    const valueVars = extractVariables(value);

    // Check for variables in key but not in value
    for (const keyVar of keyVars) {
        if (!valueVars.has(keyVar)) {
            result.push('missingVariable');
        }
    }

    // Check for variables in value but not in key
    for (const valueVar of valueVars) {
        if (!keyVars.has(valueVar)) {
            result.push('addedVariable');
        }
    }
    return result;
}

module.exports = {
    checkTranslationPair
};
