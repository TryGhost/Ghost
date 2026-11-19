import KoenigComposerContext from '../../context/KoenigComposerContext';
import React from 'react';
import trackEvent from '../../utils/analytics';
import {Input} from './Input';
import {InputListGroup, InputListLoadingItem} from './InputList';
import {KeyboardSelectionWithGroups, type GroupData} from './KeyboardSelectionWithGroups';
import {LinkInputSearchItem} from './LinkInputSearchItem';
import {useSearchLinks} from '../../hooks/useSearchLinks';

export interface LinkInputWithSearchProps {
    href?: string;
    update: (href: string, type?: string) => void;
    cancel: () => void;
}

export function LinkInputWithSearch({href, update, cancel}: LinkInputWithSearchProps) {
    const {cardConfig: {searchLinks}} = React.useContext(KoenigComposerContext);

    // store the href/query in state so we can update it without affecting the saved editor value
    const [_href, setHref] = React.useState(href);
    const {isSearching, listOptions} = useSearchLinks(_href || '', searchLinks as (term?: string) => Promise<unknown>);

    // add refs for input and container
    const containerRef = React.useRef<HTMLDivElement>(null);

    const testId = 'link-input';

    React.useEffect(() => {
        trackEvent('Link dropdown: Opened', {context: 'text'});

    }, []);

    // update the internal href when the prop changes
    React.useEffect(() => {
        setHref(href);
    }, [href]);

    // close link input when clicking outside or pressing escape
    React.useEffect(() => {
        const closeOnClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                cancel();
            }
        };

        const onEscape = (event: KeyboardEvent) => {
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

    const onItemSelected = (item: {value?: string | null; type?: string}) => {
        if (!item.value) {
            return;
        }
        update(item.value, item.type);
    };

    const getItem = (item: {value: string | null; label: string; [key: string]: unknown}, selected: boolean, onMouseOver: () => void, scrollIntoView: boolean) => {
        return (
            <LinkInputSearchItem
                key={item.value}
                dataTestId={testId}
                highlightString={_href}
                item={item}
                scrollIntoView={scrollIntoView}
                selected={selected}
                onClick={selectedItem => onItemSelected(selectedItem)}
                onMouseOver={onMouseOver}
            />
        );
    };

    const getGroup = (group: GroupData, {showSpinner}: {showSpinner?: boolean} = {}) => {
        return (
            <InputListGroup dataTestId={testId} group={group} showSpinner={showSpinner} />
        );
    };

    const showSuggestions = (isSearching || (listOptions && !!listOptions.length));

    return (
        <div ref={containerRef} className="relative m-0 flex w-full flex-col rounded-lg bg-white p-1 px-2 font-sans text-sm font-medium shadow-md dark:bg-grey-950">
            <Input
                autoFocus={true}
                className="my-1 h-auto w-full rounded-md border border-transparent bg-grey-100 px-4 py-2 text-left text-sm font-medium leading-snug text-black placeholder:text-sm placeholder:font-medium placeholder:leading-snug placeholder:text-grey-500 focus:border-green focus:bg-white focus:shadow-[0_0_0_2px_rgba(48,207,67,.25)] dark:border-grey-800/80 dark:bg-grey-900 dark:text-white dark:selection:bg-grey-600/40 dark:selection:text-grey-100 dark:focus:border-green dark:focus:bg-grey-900"
                dataTestId={testId}
                name="link-input"
                placeholder="Search or enter URL to link"
                value={_href}
                data-kg-link-input
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    // update local value to allow searching
                    setHref(e.target.value);
                }}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === 'Enter') {
                        // prevent Enter from triggering in the editor and removing text
                        // update the link value in the editor
                        e.preventDefault();
                        update(_href || '');
                        return;
                    }
                }}
            />
            {showSuggestions && (
                <>
                    <ul className="max-h-[30vh] w-full overflow-y-auto bg-white py-1 dark:bg-grey-950">
                        {isSearching && !listOptions.length && <InputListLoadingItem dataTestId={testId}/>}
                        <KeyboardSelectionWithGroups
                            getGroup={getGroup}
                            getItem={getItem}
                            groups={listOptions}
                            isLoading={isSearching}
                            onSelect={onItemSelected}
                        />
                    </ul>
                </>
            )}
        </div>
    );
}
