import PropTypes from 'prop-types';
import React, {useRef, useState} from 'react';
import {Dropdown} from './SnippetInput/Dropdown';
import {Input} from './SnippetInput/Input';

export function SnippetInput({
    value,
    onChange,
    onCreateSnippet,
    onUpdateSnippet,
    onClose,
    darkMode,
    snippets = [],
    arrowStyles
}) {
    const snippetRef = useRef(null);
    const [isCreateButtonActive, setIsCreateButtonActive] = useState(false);
    const [activeMenuItem, setActiveMenuItem] = useState(-1);
    const getSuggestedList = () => {
        return snippets.filter(snippet => snippet.name.toLowerCase().indexOf(value.toLowerCase()) !== -1);
    };

    const suggestedList = getSuggestedList();

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

    const handleInputKeyDown = (event) => {
        if (event.key === 'Escape' || event.key === 'Esc') {
            event.stopPropagation();
            onClose();
        }

        if (event.key === 'ArrowDown' || event.key === 'Down') {
            event.stopPropagation();
            event.preventDefault();
            setIsCreateButtonActive(true);
        }
    };

    const handleDropdownKeyDown = (event) => {
        if (event.key === 'ArrowDown' || event.key === 'Down') {
            event.stopPropagation();
            event.preventDefault();
            const menuItemIndex = activeMenuItem + 1;

            if (menuItemIndex > suggestedList.length - 1) {
                setActiveMenuItem(-1);
                setIsCreateButtonActive(true);
            } else {
                setActiveMenuItem(menuItemIndex);
                setIsCreateButtonActive(false);
            }
        }

        if (event.key === 'ArrowUp' || event.key === 'Up') {
            event.stopPropagation();
            event.preventDefault();

            if (isCreateButtonActive) {
                setActiveMenuItem(suggestedList.length - 1);
                setIsCreateButtonActive(false);

                return;
            }

            const menuItemIndex = activeMenuItem - 1;

            if (menuItemIndex < 0) {
                setActiveMenuItem(-1);
                setIsCreateButtonActive(true);
            } else {
                setActiveMenuItem(menuItemIndex);
                setIsCreateButtonActive(false);
            }
        }
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        onCreateSnippet();
    };

    return (
        <div
            ref={snippetRef}
            className={`${darkMode ? 'dark' : ''}`}
            onClick={e => e.stopPropagation()} // prevents card from losing selected state
        >
            <form onSubmit={handleSubmit}>
                <Input arrowStyles={arrowStyles} value={value} onChange={onChange} onClear={onClose} onKeyDown={handleInputKeyDown} />
            </form>
            {
                !!value && (
                    <Dropdown
                        activeMenuItem={activeMenuItem}
                        isCreateButtonActive={isCreateButtonActive}
                        snippets={suggestedList}
                        value={value}
                        onCreateSnippet={onCreateSnippet}
                        onKeyDown={handleDropdownKeyDown}
                        onUpdateSnippet={onUpdateSnippet}
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
