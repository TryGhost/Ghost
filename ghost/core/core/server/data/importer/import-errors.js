const errors = require('@tryghost/errors');
const {escapeHtml} = require('../../services/koenig/render-utils/escape-html');

function getEntryIdentifier(context) {
    if (!context) {
        return null;
    }

    try {
        const obj = JSON.parse(context);
        return obj.email || obj.slug || obj.name || null;
    } catch {
        return null;
    }
}

function formatImportErrorMessage(err) {
    if (errors.utils.isGhostError(err)) {
        const identifier = getEntryIdentifier(err.context);

        if (identifier) {
            return `${identifier}: ${err.message}`;
        }

        return err.message;
    }

    return err?.message || String(err);
}

function throwImportErrors(importErrors) {
    const formatted = importErrors.map(formatImportErrorMessage);
    const message = formatted.length === 1
        ? formatted[0]
        : `Import failed with ${formatted.length} errors:\n${formatted.map((line, index) => `${index + 1}. ${line}`).join('\n')}`;

    throw new errors.DataImportError({
        message,
        err: importErrors[0]
    });
}

function formatImportFailureDetailsHtml(importErrors) {
    if (!importErrors?.length) {
        return '';
    }

    const lines = importErrors.map((err) => escapeHtml(formatImportErrorMessage(err)));

    if (lines.length === 1) {
        return lines[0];
    }

    return lines.map((line, index) => `${index + 1}. ${line}`).join('<br>');
}

module.exports = {
    formatImportErrorMessage,
    formatImportFailureDetailsHtml,
    throwImportErrors
};
