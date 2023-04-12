import PropTypes from 'prop-types';
import React, {useRef} from 'react';
import {Dropdown} from './SnippetInput/Dropdown';
import {Input} from './SnippetInput/Input';

export function SnippetInput({
    value,
    onChange,
    onCreateSnippet,
    onClose,
    snippets = []
}) {
    const snippetRef = useRef(null);

    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (snippetRef.current && !snippetRef.current.contains(event.target)) {
                onClose();
            }
        };

        window.addEventListener('mousedown', handleClickOutside);
        return () => {
            window.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    const handleEscape = (event) => {
        if (event.key === 'Escape') {
            event.stopPropagation();
            onClose();
        }
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        onCreateSnippet();
    };

    const getSuggestedList = () => {
        return snippets.filter(snippet => snippet.name.toLowerCase().indexOf(value.toLowerCase()) !== -1);
    };

    const suggestedList = getSuggestedList();

    return (
        <div
            ref={snippetRef}
            onClick={e => e.stopPropagation()} // prevents card from losing selected state
        >
            <form onSubmit={handleSubmit}>
                <Input value={value} onChange={onChange} onClear={onClose} onKeyDown={handleEscape} />
            </form>
            {
                !!value && (
                    <Dropdown
                        snippets={suggestedList}
                        value={value}
                        onCreateSnippet={onCreateSnippet}
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
    onClose: PropTypes.func,
    suggestedList: PropTypes.arrayOf(PropTypes.shape({
        name: PropTypes.string.isRequired,
        value: PropTypes.string.isRequired
    }))
};
