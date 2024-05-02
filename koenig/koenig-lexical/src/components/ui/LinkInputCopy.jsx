import KoenigComposerContext from '../../context/KoenigComposerContext';
import PropTypes from 'prop-types';
import React from 'react';
import {Input} from './Input';
import {InputListGroup, InputListItem, InputListLoadingItem} from './InputListCopy';
import {KeyboardSelectionWithGroups} from './KeyboardSelectionWithGroups';
import {useSearchLinks} from '../../hooks/useSearchLinks';

export function LinkInputCopy({href, update, cancel}) {
    const {cardConfig: {searchLinks}} = React.useContext(KoenigComposerContext);

    // store the href/query in state so we can update it without affecting the saved editor value
    const [_href, setHref] = React.useState(href);
    const {isSearching, listOptions} = useSearchLinks(_href, searchLinks);

    // add refs for input and container
    const containerRef = React.useRef(null);

    const testId = 'link-input';

    // update the internal href when the prop changes
    React.useEffect(() => {
        setHref(href);
    }, [href]);

    // close link input when clicking outside or pressing escape
    React.useEffect(() => {
        const closeOnClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                cancel();
            }
        };

        const onEscape = (event) => {
            if (event.key === 'Escape') {
                cancel();
            }
        };

        window.addEventListener('mousedown', closeOnClickOutside);
        window.addEventListener('keydown', onEscape);

        return () => {
            window.removeEventListener('mousedown', closeOnClickOutside);
            window.removeEventListener('keydown', onEscape);
        };
    }, [cancel]);

    const onItemSelected = (item) => {
        update(item.value);
    };

    const getItem = (item, selected) => {
        return (
            <InputListItem key={item.value} dataTestId={testId} item={item} selected={selected} onClick={onItemSelected}/>
        );
    };

    const getGroup = (group) => {
        return (
            <InputListGroup group={group} />
        );
    };

    const showSuggestions = (isSearching || (listOptions && !!listOptions.length));

    return (
        <div ref={containerRef} className="relative m-0 flex w-full flex-col rounded bg-white p-1 font-sans text-sm font-medium shadow-md dark:bg-grey-950">
            <Input
                autoFocus={true}
                className="mb-[1px] h-auto w-full rounded pl-3 leading-loose"
                dataTestId={testId}
                placeholder="Paste URL or search posts and pages..."
                value={_href}
                onChange={(e) => {
                    // update local value to allow searching
                    setHref(e.target.value);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        // prevent Enter from triggering in the editor and removing text
                        // update the link value in the editor
                        e.preventDefault();
                        update(_href);
                        return;
                    }
                }}
            />
            {showSuggestions && (
                <>
                    <ul className="max-h-[30vh] w-full overflow-y-auto bg-white px-2 py-1 dark:bg-grey-950">
                        {isSearching && <InputListLoadingItem dataTestId={testId}/>}
                        <KeyboardSelectionWithGroups
                            getGroup={getGroup}
                            getItem={getItem}
                            groups={listOptions}
                            onSelect={onItemSelected}
                        />
                    </ul>
                </>
            )}
        </div>
    );
}

LinkInputCopy.propTypes = {
    href: PropTypes.string
};
