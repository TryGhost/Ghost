import React from 'react';
import {SnippetInput} from './SnippetInput';

export function SnippetDropdown({
    value,
    onChange,
    onCreateSnippet,
    onReplaceSnippet,
    onClear,
    snippets
}) {
    const getSuggestedList = () => {
        return snippets.filter(snippet => snippet.toLowerCase().indexOf(value.toLowerCase()));
    };

    return (
        <SnippetInput suggestedList={getSuggestedList()} />
    );
}

