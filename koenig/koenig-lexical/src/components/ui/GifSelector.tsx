import React, {useCallback, useEffect, useRef, useState} from 'react';
import SearchIcon from '../../assets/icons/kg-search.svg?react';
import {Error} from './file-selectors/Gif/Error';
import {Gif, type GifData, type GifMediaFormat} from './file-selectors/Gif/Gif';
import {Loader} from './file-selectors/Gif/Loader';

// number of columns based on selector container width
const TWO_COLUMN_WIDTH = 540;
const THREE_COLUMN_WIDTH = 940;

interface GifItem extends GifData {
    columnIndex: number;
    columnRowIndex: number;
    media_formats: {gif: GifMediaFormat; tinygif: GifMediaFormat; [key: string]: GifMediaFormat};
}

export interface GifSelectorProps {
    onGifInsert: (data: {src: string; width: number; height: number}) => void;
    onClickOutside: () => void;
    updateSearch: (term?: string) => void;
    columns: GifItem[][];
    isLoading?: boolean;
    isLazyLoading?: boolean;
    error?: unknown;
    changeColumnCount: (count: number) => void;
    loadNextPage: () => void;
    gifs: GifItem[];
}

const GifSelector = ({onGifInsert, onClickOutside, updateSearch, columns, isLoading, isLazyLoading, error, changeColumnCount, loadNextPage, gifs}: GifSelectorProps) => {
    const selectorRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const columnKeys = useRef(new WeakMap<GifItem[], string>());
    const nextColumnKey = useRef(0);
    const [highlightedGif, setHighlightedGif] = useState<GifItem | undefined>(undefined);

    const getColumnKey = useCallback((column: GifItem[]) => {
        const existingKey = columnKeys.current.get(column);
        if (existingKey) {
            return existingKey;
        }

        const key = `gif-column-${nextColumnKey.current}`;
        nextColumnKey.current += 1;
        columnKeys.current.set(column, key);
        return key;
    }, []);

    useEffect(() => {
        updateSearch();

        // We only do this for init
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!selectorRef.current) {
            return;
        }

        const resizeObserver = new ResizeObserver((entries) => {
            const [containerEntry] = entries;
            const contentBoxSize = Array.isArray(containerEntry.contentBoxSize) ? containerEntry.contentBoxSize[0] : containerEntry.contentBoxSize;

            const width = contentBoxSize.inlineSize;

            let columnsCount = 4;

            if (width <= TWO_COLUMN_WIDTH) {
                columnsCount = 2;
            } else if (width <= THREE_COLUMN_WIDTH) {
                columnsCount = 3;
            }

            changeColumnCount(columnsCount);
        });
        resizeObserver.observe(selectorRef.current);

        return () => {
            resizeObserver?.disconnect();
        };

        // We only do this for init
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
                onClickOutside();
            }
        };
        window.addEventListener('mousedown', handleClickOutside);
        return () => {
            window.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClickOutside]);

    const handleGifSelect = useCallback((selectedGif: GifItem) => {
        const gif = selectedGif.media_formats.gif;
        const data = {
            src: gif.url,
            width: gif.dims[0],
            height: gif.dims[1]
        };
        onGifInsert(data);
    }, [onGifInsert]);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateSearch(e.target.value);
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const container = e.target as HTMLDivElement;
        if (container.scrollTop + container.clientHeight >= container.scrollHeight - 1000) {
            loadNextPage();
        }
    };

    const focusSearch = useCallback(() => {
        searchRef.current?.focus();
    }, []);

    const highlightFirst = useCallback(() => {
        setHighlightedGif(gifs[0]);
    }, [gifs]);

    const highlightNext = useCallback(() => {
        if (highlightedGif === gifs[gifs.length - 1]) {
            // reached the end, do nothing
            return;
        }

        setHighlightedGif(gifs[highlightedGif!.index + 1]);
    }, [gifs, highlightedGif]);

    const highlightPrev = useCallback(() => {
        if (highlightedGif!.index === 0) {
            // reached the beginning, focus the search bar
            focusSearch();
        }

        setHighlightedGif(gifs[highlightedGif!.index - 1]);
    }, [focusSearch, gifs, highlightedGif]);

    const moveHighlightDown = useCallback(() => {
        const nextGif = columns[highlightedGif!.columnIndex][highlightedGif!.columnRowIndex + 1];

        if (nextGif) {
            setHighlightedGif(nextGif);
        }
    }, [columns, highlightedGif]);

    const moveHighlightUp = useCallback(() => {
        const nextGif = columns[highlightedGif!.columnIndex][highlightedGif!.columnRowIndex - 1];

        if (nextGif) {
            setHighlightedGif(nextGif);
        } else {
            // already at top, focus the search bar
            focusSearch();
        }
    }, [columns, focusSearch, highlightedGif]);

    const moveToNextHorizontalGif = useCallback((direction: 'left' | 'right') => {
        const highlightedElem = document.querySelector(`[data-gif-index="${highlightedGif!.index}"]`);
        if (!highlightedElem) {
            return;
        }
        const highlightedElemRect = highlightedElem.getBoundingClientRect();

        let x;
        if (direction === 'left') {
            x = highlightedElemRect.left - (highlightedElemRect.width / 2);
        } else {
            x = highlightedElemRect.right + (highlightedElemRect.width / 2);
        }

        let y = highlightedElemRect.top + (highlightedElemRect.height / 3);

        let foundGifElem;
        let jumps = 0;

        // we might hit spacing between gifs, keep moving up 5 px until we get a match
        while (!foundGifElem) {
            const possibleMatch = document.elementFromPoint(x, y)?.closest('[data-gif-index]') as HTMLElement | null;

            if (possibleMatch?.dataset?.gifIndex !== undefined) {
                foundGifElem = possibleMatch;
                break;
            }

            jumps += 1;
            y -= 5;

            if (jumps > 10) {
                // give up to avoid infinite loop
                break;
            }
        }

        if (foundGifElem) {
            setHighlightedGif(gifs[Number(foundGifElem.dataset.gifIndex)]);
        }
    }, [gifs, highlightedGif]);

    const moveHighlightRight = useCallback(() => {
        if (highlightedGif!.columnIndex === columns.length - 1) {
            // we don't wrap and we're on the last column, do nothing
            return;
        }

        moveToNextHorizontalGif('right');
    }, [columns.length, highlightedGif, moveToNextHorizontalGif]);

    const moveHighlightLeft = useCallback(() => {
        if (highlightedGif!.index === 0) {
            // on the first Gif, focus the search bar
            return focusSearch();
        }

        if (highlightedGif!.columnIndex === 0) {
            // we don't wrap and we're on the first column, do nothing
            return;
        }

        moveToNextHorizontalGif('left');
    }, [focusSearch, highlightedGif, moveToNextHorizontalGif]);

    const handleTab = useCallback((event: KeyboardEvent) => {
        // event.stopPropagation();
        // event.preventDefault();

        const target = event.target as HTMLElement | null;

        if (event.shiftKey) {
            if (highlightedGif) {
                event.preventDefault();
                return highlightPrev();
            }
        } else {
            if (target?.tagName === 'INPUT') {
                event.preventDefault();
                (target as HTMLInputElement).blur();
                return highlightFirst();
            }

            if (highlightedGif) {
                event?.preventDefault();
                return highlightNext();
            }
        }
    }, [highlightedGif, highlightFirst, highlightNext, highlightPrev]);

    const handleLeft = useCallback((event: KeyboardEvent) => {
        if (highlightedGif) {
            event.preventDefault();
            moveHighlightLeft();
        }
    }, [highlightedGif, moveHighlightLeft]);

    const handleRight = useCallback((event: KeyboardEvent) => {
        if (highlightedGif) {
            event.preventDefault();
            moveHighlightRight();
        }
    }, [highlightedGif, moveHighlightRight]);

    const handleUp = useCallback((event: KeyboardEvent) => {
        if (highlightedGif) {
            event.preventDefault();
            moveHighlightUp();
        }
    }, [highlightedGif, moveHighlightUp]);

    const handleDown = useCallback((event: KeyboardEvent) => {
        const target = event.target as HTMLElement | null;
        if (target?.tagName === 'INPUT') {
            event.preventDefault();
            (target as HTMLInputElement).blur();
            return highlightFirst();
        }

        if (highlightedGif) {
            event.preventDefault();
            moveHighlightDown();
        }
    }, [highlightedGif, highlightFirst, moveHighlightDown]);

    const handleEnter = useCallback((event: KeyboardEvent) => {
        event.preventDefault();

        const target = event.target as HTMLElement | null;
        if (target?.tagName === 'INPUT') {
            (target as HTMLInputElement).blur();
            return highlightFirst();
        }

        if (highlightedGif) {
            return handleGifSelect(highlightedGif);
        }
    }, [handleGifSelect, highlightedGif, highlightFirst]);

    const handleGifHighlight = useCallback((event: KeyboardEvent) => {
        switch (event.key) {
        case 'Tab':
            return handleTab(event);
        case 'ArrowLeft':
            return handleLeft(event);
        case 'ArrowRight':
            return handleRight(event);
        case 'ArrowUp':
            return handleUp(event);
        case 'ArrowDown':
            return handleDown(event);
        case 'Enter':
            return handleEnter(event);
        default:
            return null;
        }
    }, [handleDown, handleEnter, handleLeft, handleRight, handleTab, handleUp]);

    useEffect(() => {
        document.addEventListener('keydown', handleGifHighlight);

        return () => {
            document.removeEventListener('keydown', handleGifHighlight);
        };
    }, [handleGifHighlight]);

    const isSearchInProgress = isLoading && !isLazyLoading;

    return (
        <div
            ref={selectorRef}
            className="flex h-[540px] flex-col rounded border border-grey-200 bg-grey-50 dark:border-none dark:bg-grey-900"
            data-testid="gif-selector"
            // prevent click handle in the editor while selector is active
            onClick={e => e.stopPropagation()}
        >
            <header className="p-6">
                <div className="relative w-full">
                    <SearchIcon className="absolute left-4 top-1/2 size-4 -translate-y-2 text-grey-500 dark:text-grey-800" />
                    <input
                        ref={searchRef}
                        className="h-10 w-full rounded-full border border-grey-300 pl-10 pr-8 font-sans text-md font-normal text-black focus:border-green focus:shadow-insetgreen dark:border-grey-800 dark:bg-grey-950 dark:text-white dark:placeholder:text-grey-800 dark:focus:border-green"
                        placeholder='Search KLIPY'
                        autoFocus
                        onChange={handleSearch}
                    />
                </div>
            </header>

            <div className="relative h-full overflow-hidden">
                <div className="h-full overflow-auto px-6" onScroll={handleScroll}>
                    {
                        !error && !isSearchInProgress && (
                            <div className="flex gap-4">
                                {columns.map(column => (
                                    <section key={getColumnKey(column)} className="flex grow basis-0 flex-col justify-start gap-4">
                                        {column.map(gif => (
                                            <Gif key={gif.id} gif={gif} highlightedGif={highlightedGif} onClick={handleGifSelect} />
                                        ))}
                                    </section>
                                ))}
                            </div>
                        )
                    }

                    {!!isLoading && !error && <Loader isLazyLoading={isLazyLoading} />}

                    {!!error && <div data-testid="gif-selector-error"><Error error={error as string} /></div>}
                </div>
            </div>
        </div>
    );
};

export default GifSelector;
