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
    snippets = []
}) {
    const snippetRef = useRef(null);
    const [isCreateButtonActive, setIsCreateButtonActive] = useState(true);
    const [activeMenuItem, setActiveMenuItem] = useState(-1);
    const [suggestedList, setSuggestedList] = useState([]);

    // default to first snippet or create new button
    React.useEffect(() => {
        const newSuggestedList = snippets.filter(snippet => snippet.name.toLowerCase().includes(value.toLowerCase()));
        if (newSuggestedList.length === 0) {
            setIsCreateButtonActive(true);
            setActiveMenuItem(-1);
        } else {
            setIsCreateButtonActive(false);
            setActiveMenuItem(0);
        }
        setSuggestedList(newSuggestedList);
    }, [value, snippets]);

    // close snippets menu if clicked outside the input/dropdown
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

            if (suggestedList.length === 0) {
                return;
            }

            // handle first arrow down from input
            if (activeMenuItem === -1 && !isCreateButtonActive) {
                setIsCreateButtonActive(true);
                return;
            }

            const menuItemIndex = activeMenuItem + 1;

            // handle looping back to top of list
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

            if (suggestedList.length === 0) {
                return;
            }

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

        if (event.key === 'Enter') {
            if (isCreateButtonActive) {
                event.stopPropagation();
                event.preventDefault();
                onCreateSnippet();
            } else if (activeMenuItem > -1) {
                event.stopPropagation();
                event.preventDefault();
                onUpdateSnippet(suggestedList[activeMenuItem].name);
            }
        }
    };

    return (
        <div
            ref={snippetRef}
            onClick={e => e.stopPropagation()} // prevents card from losing selected state
        >
            <Input
                value={value}
                onChange={onChange}
                onClear={onClose}
                onKeyDown={handleInputKeyDown}
            />
            {
                !!value && (
                    <Dropdown
                        activeMenuItem={activeMenuItem}
                        isCreateButtonActive={isCreateButtonActive}
                        snippets={suggestedList}
                        value={value}
                        onCreateSnippet={onCreateSnippet}
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
