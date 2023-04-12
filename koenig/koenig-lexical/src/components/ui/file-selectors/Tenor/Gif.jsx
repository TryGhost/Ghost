import {useEffect, useRef} from 'react';
export function Gif({gif, onClick, highlightedGif = {}}) {
    const gifRef = useRef(null);
    const media = gif.media_formats.tinygif;

    useEffect(() => {
        const isFocused = highlightedGif.id === gif.id;
        if (isFocused) {
            gifRef.current?.focus();
        } else {
            gifRef.current?.blur();
        }
    }, [gif.id, highlightedGif.id]);

    const handleClick = () => {
        onClick(gif);
    };

    return (
        <button
            ref={gifRef}
            className="cursor-pointer border-2 border-transparent focus:border-green-600"
            data-tenor-index={gif.index}
            type="button"
            onClick={handleClick}
        >
            <img alt={media.content_description} height={media.dims[1]} src={media.url} width={media.dims[0]} />
        </button>
    );
}
