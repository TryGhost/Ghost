import PropTypes from 'prop-types';
import React from 'react';
import {Dropdown} from './SnippetInput/Dropdown';
import {Input} from './SnippetInput/Input';

export function SnippetInput({
    value,
    onChange,
    onCreateSnippet,
    onReplaceSnippet,
    onClear,
    snippets = []
}) {
    const getSuggestedList = () => {
        return snippets.filter(snippet => snippet.name.toLowerCase().indexOf(value.toLowerCase()) !== -1);
    };

    const suggestedList = getSuggestedList();

    return (
        <div>
            <Input value={value} onChange={onChange} onClear={onClear} />
            {
                !!value && (
                    <Dropdown
                        snippets={suggestedList}
                        value={value}
                        onCreateSnippet={onCreateSnippet}
                        onReplaceSnippet={onReplaceSnippet}
                    />
                )
            }
        </div>
    );
}

SnippetInput.propTypes = {
    value: PropTypes.string,
    onChange: PropTypes.func,
    onCreateSnippet: PropTypes.func,
    onReplaceSnippet: PropTypes.func,
    onClear: PropTypes.func,
    suggestedList: PropTypes.arrayOf(PropTypes.shape({
        name: PropTypes.string.isRequired,
        value: PropTypes.string.isRequired
    }))
};
