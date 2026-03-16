import {useEffect, useRef} from 'react';

export interface GifMediaFormat {
    url: string;
    dims: [number, number];
    content_description?: string;
}

export interface GifData {
    id: string;
    index: number;
    media_formats: {
        tinygif: GifMediaFormat;
        [key: string]: GifMediaFormat;
    };
}

interface GifProps<T extends GifData = GifData> {
    gif: T;
    onClick: (gif: T) => void;
    highlightedGif?: {id?: string};
}

export function Gif<T extends GifData = GifData>({gif, onClick, highlightedGif = {}}: GifProps<T>) {
    const gifRef = useRef<HTMLButtonElement>(null);
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
            data-gif-index={gif.index}
            type="button"
            onClick={handleClick}
        >
            <img alt={media.content_description} height={media.dims[1]} src={media.url} width={media.dims[0]} />
        </button>
    );
}
